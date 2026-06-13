/**
 * Manual auth session cookie management for Astro server-side contexts.
 *
 * Instead of relying on GoTrueClient's async storage adapter (which has
 * timing issues with Astro 6.4.4's cookie pipeline), we manage the
 * session cookie manually:
 *
 *   1. After login/signup/callback, call `setAuthSession()` to write
 *      the session JSON into a cookie.
 *   2. In middleware, call `getAuthSession()` to read it back; if the
 *      token is expired, call `refreshAuthSession()` before proceeding.
 *   3. Call `clearAuthSession()` on sign-out.
 */

import { env } from './env';

// ─── Types ────────────────────────────────────────────────────────────

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: Record<string, unknown> | null;
}

// ─── Cookie helpers ───────────────────────────────────────────────────

export function authCookieName(): string {
  const match = env.PUBLIC_SUPABASE_URL?.match(/https?:\/\/([^.]+)\./);
  return `sb-${match?.[1] ?? 'default'}-auth-token`;
}

const AUTH_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: true,
  secure: env.PUBLIC_SITE_URL.startsWith('https'),
  maxAge: 2592000, // 30 days
};

/**
 * Minimal shape from Astro's context.cookies that we need.
 * Using a structural type so we don't import Astro types.
 */
interface CookieAccess {
  get: (key: string) => { value: string | null } | undefined;
  set: (key: string, value: string, opts: typeof AUTH_COOKIE_OPTIONS) => void;
  delete: (key: string, opts: { path: string }) => void;
}

/**
 * Strip the session user to just the `id` field for cookie storage.
 * The full user object (identities, metadata, etc.) can easily exceed the
 * 4096-byte browser cookie limit for OAuth sessions.
 */
function minimizeSession(session: AuthSession): AuthSession {
  const u = session.user as Record<string, unknown> | null | undefined;
  return {
    ...session,
    user: u?.id ? { id: u.id } : null,
  } as AuthSession;
}

export function setAuthSession(
  cookies: CookieAccess,
  session: AuthSession,
): void {
  const key = authCookieName();
  cookies.set(key, JSON.stringify(minimizeSession(session)), AUTH_COOKIE_OPTIONS);
}

export function getAuthSession(
  cookies: CookieAccess,
  request?: Request,
): AuthSession | null {
  const key = authCookieName();

  // Try Astro's cookie API first (incoming Cookie header, automatically parsed).
  const raw = cookies.get(key)?.value;
  if (raw) {
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      // value was not plain JSON — may be URL-encoded from a manual Set-Cookie
    }
  }

  // Fallback: read the raw Cookie header directly. This catches cases where
  // the cookie was set via a manual Set-Cookie header (encodeURIComponent)
  // and Astro's cookie API didn't decode it back to plain JSON.
  if (request) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${escaped}=([^;]*)`));
      if (match) {
        const rawValue = decodeURIComponent(match[1].trim());
        try {
          return JSON.parse(rawValue) as AuthSession;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

export function clearAuthSession(cookies: CookieAccess): void {
  const key = authCookieName();
  cookies.delete(key, { path: '/' });
}

/**
 * Build the `Set-Cookie` header string directly, bypassing Astro's cookie
 * pipeline. Use this in API routes that return a redirect — Astro 6 can
 * lose cookies set via `context.cookies.set()` when combined with
 * `context.redirect()`.
 */
export function buildSetCookieHeader(session: AuthSession): string {
  const key = authCookieName();
  const value = encodeURIComponent(JSON.stringify(minimizeSession(session)));
  const opts = AUTH_COOKIE_OPTIONS;
  const parts = [`${key}=${value}`, `Path=${opts.path}`, `SameSite=${opts.sameSite}`, `Max-Age=${opts.maxAge}`];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearCookieHeader(): string {
  const key = authCookieName();
  return `${key}=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly`;
}

// ─── Temp session cookie (for 2FA flow) ──────────────────────────────

const TEMP_SESSION_COOKIE = 'sb-2fa-pending';
const TEMP_SESSION_MAX_AGE = 300; // 5 minutes

export interface TempSession {
  user_id: string;
  email: string;
  session: AuthSession;
  expires_at: number;
}

export function setTempSession(cookies: CookieAccess, temp: TempSession): void {
  cookies.set(TEMP_SESSION_COOKIE, JSON.stringify(temp), {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: env.PUBLIC_SITE_URL.startsWith('https'),
    maxAge: TEMP_SESSION_MAX_AGE,
  });
}

export function getTempSession(cookies: CookieAccess, request?: Request): TempSession | null {
  // Try Astro's cookie API first
  const raw = cookies.get(TEMP_SESSION_COOKIE)?.value;
  if (raw) {
    try {
      const temp = JSON.parse(raw) as TempSession;
      if (temp.expires_at > Date.now()) return temp;
    } catch { /* ignore */ }
  }

  // Fallback: raw Cookie header
  if (request) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)sb-2fa-pending=([^;]*)/);
      if (match) {
        try {
          const temp = JSON.parse(decodeURIComponent(match[1].trim())) as TempSession;
          if (temp.expires_at > Date.now()) return temp;
        } catch { /* ignore */ }
      }
    }
  }

  return null;
}

export function clearTempSession(cookies: CookieAccess): void {
  cookies.delete(TEMP_SESSION_COOKIE, { path: '/' });
}

export function buildSetTempSessionHeader(temp: TempSession): string {
  const value = encodeURIComponent(JSON.stringify(temp));
  const parts = [
    `${TEMP_SESSION_COOKIE}=${value}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${TEMP_SESSION_MAX_AGE}`,
    'HttpOnly',
  ];
  if (env.PUBLIC_SITE_URL.startsWith('https')) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearTempSessionHeader(): string {
  return `${TEMP_SESSION_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly`;
}

// ─── Auth REST helpers (server-side only) ─────────────────────────────

const ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY;
const AUTH_URL = `${env.PUBLIC_SUPABASE_URL}/auth/v1`;

async function authPost(path: string, body: unknown, extraHeaders?: Record<string, string>) {
  return fetch(`${AUTH_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, ...extraHeaders },
    body: JSON.stringify(body),
  });
}

/**
 * Validate an access token and return the user object.
 * Makes a network request to Supabase Auth, so the result is always fresh.
 */
/** Minimal user shape returned by the Supabase Auth API. */
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  aud?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export async function getAuthUser(accessToken: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const res = await fetch(`${AUTH_URL}/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { user: null, error: body.msg ?? body.error ?? 'Invalid token' };
  }
  const user = await res.json() as AuthUser;
  return { user, error: null };
}

/**
 * Refresh an expired access token using the refresh token.
 * Returns the full new session.
 */
export async function refreshAuthSession(
  refreshToken: string,
): Promise<{ session: AuthSession | null; error: string | null }> {
  const res = await authPost('/token?grant_type=refresh_token', { refresh_token: refreshToken });
  const data = await res.json();
  if (!res.ok) {
    return { session: null, error: data.error_description ?? data.error ?? 'Invalid refresh token' };
  }
  return {
    session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user ?? null,
    },
    error: null,
  };
}

/**
 * Sign in with email/username and password.
 * Returns the full session on success.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ session: AuthSession | null; error: string | null }> {
  const res = await authPost('/token?grant_type=password', { email, password });
  const data = await res.json();
  if (!res.ok) {
    return { session: null, error: data.error_description ?? data.error ?? data.msg ?? 'Invalid login credentials' };
  }
  return {
    session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user ?? null,
    },
    error: null,
  };
}

/**
 * Sign up a new user with email and password.
 * If the project has email confirmations disabled, this returns a session.
 */
export async function signUp(
  email: string,
  password: string,
  options?: { data?: Record<string, unknown>; emailRedirectTo?: string },
): Promise<{ session: AuthSession | null; error: string | null }> {
  const body: Record<string, unknown> = { email, password };
  if (options?.data) body.data = options.data;
  if (options?.emailRedirectTo) body.email_redirect_to = options.emailRedirectTo;
  const res = await authPost('/signup', body);
  const data = await res.json();
  if (!res.ok) {
    return { session: null, error: data.error_description ?? data.error ?? data.msg ?? 'Sign up failed' };
  }
  if (!data.access_token) {
    // Email confirmation required — no session returned yet
    return { session: null, error: null };
  }
  return {
    session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user ?? null,
    },
    error: null,
  };
}

/**
 * Generate a PKCE code verifier (43-128 chars, unreserved characters only).
 * Uses Node.js crypto (server-side only).
 */
export function generatePkceVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

/**
 * Generate a PKCE code challenge (base64url-encoded SHA-256 of verifier).
 */
export async function generatePkceChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Code verifier cookie helpers.
 * Cookie name: same ref pattern as authCookieName().
 */
export function codeVerifierCookieName(): string {
  return `${authCookieName()}-code-verifier`;
}

/**
 * Build the Supabase OAuth authorize URL for PKCE flow with a given provider.
 */
export function buildOAuthAuthorizeUrl(
  provider: string,
  redirectTo: string,
  codeChallenge: string,
): string {
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    code_challenge: codeChallenge,
    code_challenge_method: 's256',
  });
  return `${env.PUBLIC_SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
}

/**
 * Exchange a PKCE authorization code for a session using Supabase Auth API.
 * Uses the correct Supabase PKCE endpoint (grant_type=pkce, auth_code, code_verifier).
 */
export async function exchangePkceCodeForSession(
  authCode: string,
  codeVerifier: string,
): Promise<{ session: AuthSession | null; error: string | null }> {
  const res = await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.PUBLIC_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      grant_type: 'pkce',
      auth_code: authCode,
      code_verifier: codeVerifier,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { session: null, error: data.error_description ?? data.error ?? 'Code exchange failed' };
  }
  return {
    session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user ?? null,
    },
    error: null,
  };
}
