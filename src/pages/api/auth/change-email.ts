export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { getAuthSession } from '../../../lib/auth-cookie';
import { prisma } from '../../../lib/prisma';
import { verifyTOTP } from '../../../lib/two-factor';

function fail(redirect: URL, code: string): Response {
  redirect.searchParams.set('error', code);
  return new Response(null, { status: 303, headers: { Location: redirect.pathname + redirect.search } });
}

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response('Forbidden', { status: 403 });
  }

  const session = getAuthSession(context.cookies, context.request);
  if (!session?.access_token) {
    return context.redirect('/login', 303);
  }

  const form = await context.request.formData();
  const newEmail = typeof form.get('new_email') === 'string' ? (form.get('new_email') as string).trim() : '';
  const password = typeof form.get('password') === 'string' ? form.get('password') as string : '';
  const totpToken = typeof form.get('totp_token') === 'string' ? (form.get('totp_token') as string).trim() : '';

  const redirect = new URL('/perfil/editar?tab=seguridad', env.PUBLIC_SITE_URL);

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return fail(redirect, 'invalid_email');
  }
  if (!password) {
    return fail(redirect, 'password_required');
  }

  const userId = (session.user as Record<string, unknown>)?.id as string;

  // Check if 2FA is enabled — require TOTP if so
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (profile?.twoFactorEnabled) {
    if (!totpToken || totpToken.length !== 6) {
      return fail(redirect, 'totp_required');
    }
    if (!profile.twoFactorSecret || !verifyTOTP(profile.twoFactorSecret, totpToken)) {
      return fail(redirect, 'invalid_totp');
    }
  }

  // Verify password
  const verifyRes = await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.PUBLIC_SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: (session.user as Record<string, unknown>)?.email as string ?? '', password }),
  });
  if (!verifyRes.ok) {
    return fail(redirect, 'wrong_password');
  }

  // Update email via admin API
  const adminRes = await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ email: newEmail }),
  });

  if (!adminRes.ok) {
    console.error('[change-email] admin API failed');
    return fail(redirect, 'email_change_failed');
  }

  redirect.searchParams.set('success', 'email_changed');
  return new Response(null, { status: 303, headers: { Location: redirect.pathname + redirect.search } });
};
