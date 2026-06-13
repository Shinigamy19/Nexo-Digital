export const prerender = false;

import type { APIRoute } from 'astro';
import { signInWithPassword, buildSetCookieHeader, setTempSession } from '../../../lib/auth-cookie';
import { isSameOrigin, publicErrorCode, safeRedirect } from '../../../lib/security';
import { env } from '../../../lib/env';
import { prisma } from '../../../lib/prisma';

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await context.request.formData();
  const input = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const next = safeRedirect(context.url.searchParams.get('next') ?? '');

  if (!input || !password) {
    return context.redirect('/login?error=invalid_credentials', 303);
  }

  let email = input;
  if (!input.includes('@')) {
    const rows = await prisma.$queryRaw<{ email: string }[]>`
      SELECT email FROM auth.users
      WHERE id = (SELECT id FROM public.profiles WHERE username = ${input})
    `;
    if (!rows.length) {
      return context.redirect('/login?error=invalid_credentials', 303);
    }
    email = rows[0].email;
  }

  const { session, error } = await signInWithPassword(email, password);

  if (error) {
    const code = publicErrorCode(error);
    return context.redirect(`/login?error=${code}&email=${encodeURIComponent(input)}`, 303);
  }

  if (!session) {
    return context.redirect('/login?error=generic', 303);
  }

  // Check if 2FA is enabled for this user
  const userId = (session.user as Record<string, unknown>)?.id as string;
  if (userId) {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (profile?.twoFactorEnabled) {
      // Set temp session cookie and redirect to 2FA verification
      setTempSession(context.cookies, {
        user_id: userId,
        email,
        session,
        expires_at: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      const redirectUrl = `/verificar-2fa?next=${encodeURIComponent(next)}`;
      return new Response(null, {
        status: 303,
        headers: { Location: redirectUrl },
      });
    }
  }

  // No 2FA — set full session cookie
  const cookieHeader = buildSetCookieHeader(session);
  return new Response(null, {
    status: 303,
    headers: { Location: next, 'Set-Cookie': cookieHeader },
  });
};
