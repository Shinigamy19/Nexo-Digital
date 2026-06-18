import { defineMiddleware } from 'astro:middleware';
import { safeRedirect } from './lib/security';
import { isPlaceholderEnv } from './lib/env';
import { getAuthSession, getAuthUser, refreshAuthSession, setAuthSession, clearAuthSession } from './lib/auth-cookie';
import { prisma } from './lib/prisma';
import type { SessionUser } from './types/database';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/registro',
  '/recuperar',
  '/verificar-2fa',
  '/auth/callback',
  '/auth/confirm',
  '/auth/error',
  '/empleos',
  '/recursos',
  '/proyectos',
  '/eventos',
]);

const isPublicPath = (pathname: string): boolean => {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/api/public/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-XSS-Protection': '0',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

function applySecurityHeaders(headers: Headers): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (isPlaceholderEnv()) {
    const response = new Response(
      'Backend not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env and restart.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
    applySecurityHeaders(response.headers);
    return response;
  }

  let session = getAuthSession(context.cookies, context.request);

  if (session?.access_token) {
    const marginMs = 10 * 60 * 1000;
    if (session.expires_at * 1000 - Date.now() < marginMs) {
      const result = await refreshAuthSession(session.refresh_token);
      if (result.session) {
        session = result.session;
        setAuthSession(context.cookies, session);
      } else {
        session = null;
        clearAuthSession(context.cookies);
      }
    }
  }

  if (session?.access_token && session) {
    const { user } = await getAuthUser(session.access_token);

    const userId = user?.id ?? (session.user as Record<string, unknown> | null)?.id;
    const userEmail = user?.email ?? (session.user as Record<string, unknown> | null)?.email;

    if (userId && typeof userId === 'string') {
      let profile = await prisma.profile.findUnique({ where: { id: userId } });

      // Safety net: create profile if missing (e.g. signup before profile creation was added)
      if (!profile) {
        try {
          profile = await prisma.profile.create({
            data: {
              id: userId,
              username: `user_${userId.slice(0, 8)}`,
              displayName: (userEmail as string) ?? null,
              role: 'user',
            },
          });
        } catch {
          profile = null;
        }
      }

      context.locals.user = {
        id: userId,
        email: (userEmail as string) ?? null,
        profile: profile
          ? {
              id: profile.id,
              username: profile.username,
              display_name: profile.displayName,
              avatar_url: profile.avatarUrl,
              bio: profile.bio,
              discipline: profile.discipline,
              skills: profile.skills,
              website: profile.website,
              github: profile.github,
              behance: profile.behance,
              substack: profile.substack,
              itch: profile.itch,
              youtube: profile.youtube,
              linkedin: profile.linkedin,
              twitter: profile.twitter,
              tiktok: profile.tiktok,
              instagram: profile.instagram,
              linktree: profile.linktree,
              show_email: profile.showEmail,
              two_factor_enabled: profile.twoFactorEnabled,
              role: profile.role as import('./types/database').UserRole,
              created_at: profile.createdAt.toISOString(),
              updated_at: profile.updatedAt.toISOString(),
            }
          : null,
      } satisfies SessionUser;
    } else {
      session = null;
      clearAuthSession(context.cookies);
    }
  }

  if (isPublicPath(context.url.pathname)) {
    return next();
  }

  if (!context.locals.user) {
    if (context.url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const redirectTo = safeRedirect(context.url.pathname + context.url.search);
    return context.redirect(`/login?next=${encodeURIComponent(redirectTo)}`, 303);
  }

  const response = await next();
  applySecurityHeaders(response.headers);
  return response;
});
