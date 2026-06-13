/**
 * Security helpers shared across API routes and middleware.
 *
 * Centralised so the rules are easy to audit and consistent across the
 * app. Any change here has security implications — review carefully.
 */

/**
 * Routes that must never be claimed as usernames. We block:
 *   - system paths (api, auth, _astro) and the marketing site routes
 *   - role names and obvious social handles
 *   - common reserved words in en/es
 */
export const RESERVED_USERNAMES = new Set<string>([
  // Marketing routes
  'home', 'index', 'proyectos', 'recursos', 'empleos', 'eventos',
  // Auth routes
  'login', 'registro', 'recuperar', 'logout', 'signin', 'signup',
  'auth', 'callback', 'confirm', 'error',
  // System paths
  'api', 'admin', 'administrator', 'moderator', 'mod',
  'u', 'user', 'users', 'perfil', 'profile', 'account', 'settings',
  'dashboard', 'panel',
  'static', 'public', 'assets', '_astro',
  'favicon.ico', 'robots.txt', 'sitemap.xml',
  // Brand / community
  'nexo', 'nexodigital', 'nexo-digital', 'admin-nexo', 'soporte', 'support',
  'help', 'ayuda', 'contacto', 'contact', 'about', 'acerca',
  'staff', 'team', 'equipo', 'official', 'oficial',
  'root', 'superuser', 'sysadmin', 'webmaster',
  // Common social-handle-shaped reserved words
  'me', 'you', 'all', 'everyone', 'anonymous', 'anon',
  // Spanish/English slurs would be added here as the community moderates
]);

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export function isValidUsername(value: string): boolean {
  if (!USERNAME_RE.test(value)) return false;
  if (RESERVED_USERNAMES.has(value.toLowerCase())) return false;
  return true;
}

/**
 * Returns a safe relative path for redirects, or `fallback` if the input
 * could be used for open redirects. Blocks absolute URLs and protocol-
 * relative URLs (`//evil.com`) by requiring a single leading slash and
 * no double slash.
 */
export function safeRedirect(next: string | null | undefined, fallback = '/perfil'): string {
  if (!next || typeof next !== 'string') return fallback;
  if (next.length > 512) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//')) return fallback;          // protocol-relative
  if (next.startsWith('/\\')) return fallback;          // backslash trick
  if (next.includes('\\')) return fallback;            // IE-style parsing
  if (next.toLowerCase().startsWith('/javascript:')) return fallback;
  return next;
}

/**
 * CSRF check: validates that the request originates from the same site.
 *
 * Primary defence is SameSite=Lax cookie. This is an additional layer.
 * Checks Origin header first, then Referer. If neither is present,
 * the request is allowed (some browsers/tools don't send them).
 */
export function isSameOrigin(request: Request, expectedOrigin: string): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    // Origin is the canonical header for CSRF checks
    try {
      const originUrl = new URL(origin);
      const expectedUrl = new URL(expectedOrigin);
      if (originUrl.origin !== expectedUrl.origin) return false;
    } catch {
      return false;
    }
    return true;
  }

  // Fallback to Referer
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const expectedUrl = new URL(expectedOrigin);
      if (refererUrl.origin !== expectedUrl.origin) return false;
    } catch {
      return false;
    }
    return true;
  }

  // No Origin or Referer — allow (lenient fallback for tools that strip headers)
  return true;
}

/**
 * Maps Supabase / general auth errors to short error codes we expose in
 * URL query params. Avoids leaking which emails are registered.
 */
const KNOWN_AUTH_CODES = new Set([
  'invalid_credentials',
  'email_not_confirmed',
  'too_many_requests',
  'signup_disabled',
  'email_taken',
  'weak_password',
  'invalid_email',
  'oauth_failed',
  'generic',
]);

export function publicErrorCode(raw: string): string {
  // Lowercase, strip any whitespace, replace unknown with 'generic'.
  const normalized = raw.toLowerCase().trim();
  if (KNOWN_AUTH_CODES.has(normalized)) return normalized;
  return 'generic';
}
