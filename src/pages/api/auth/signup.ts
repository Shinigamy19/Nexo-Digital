export const prerender = false;

import type { APIRoute } from 'astro';
import { signUp, buildSetCookieHeader } from '../../../lib/auth-cookie';
import { isSameOrigin, publicErrorCode, safeRedirect } from '../../../lib/security';
import { env } from '../../../lib/env';
import { prisma } from '../../../lib/prisma';

const MIN_PASSWORD = 8;
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await context.request.formData();
  const username = String(form.get('username') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const passwordConfirm = String(form.get('password_confirm') ?? '');
  const acceptedTerms = form.get('terms') === 'true';
  const next = safeRedirect(context.url.searchParams.get('next') ?? '');

  if (!acceptedTerms) {
    return context.redirect('/registro?error=generic', 303);
  }

  if (!email || !email.includes('@')) {
    return context.redirect('/registro?error=invalid_email', 303);
  }

  if (password.length < MIN_PASSWORD) {
    return context.redirect('/registro?error=weak_password', 303);
  }

  if (password !== passwordConfirm) {
    return context.redirect('/registro?error=passwords_mismatch', 303);
  }

  if (!username || username.length < 3 || username.length > 30 || !USERNAME_RE.test(username)) {
    return context.redirect('/registro?error=invalid_username', 303);
  }

  const existing = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existing) {
    return context.redirect('/registro?error=username_taken', 303);
  }

  const { session, error } = await signUp(email, password, {
    data: { username, full_name: username },
    emailRedirectTo: `${env.PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
  });

  if (error) {
    const code = publicErrorCode(error);
    return context.redirect(`/registro?error=${code}`, 303);
  }

  if (!session) {
    // Email confirmation required — no session returned
    return context.redirect('/login?error=email_not_confirmed', 303);
  }

  // Create profile record linked to the Supabase auth user
  try {
    const userId = String(session.user?.id ?? '');
    await prisma.profile.create({
      data: {
        id: userId,
        username,
        displayName: username,
        role: 'user',
      },
    });
  } catch (e) {
    // Profile might already exist; continue
  }

  const cookieHeader = buildSetCookieHeader(session);
  return new Response(null, {
    status: 303,
    headers: { Location: next, 'Set-Cookie': cookieHeader },
  });
};
