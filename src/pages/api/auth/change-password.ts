export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { getAuthSession } from '../../../lib/auth-cookie';

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
  const currentPassword = typeof form.get('current_password') === 'string' ? form.get('current_password') as string : '';
  const newPassword = typeof form.get('new_password') === 'string' ? form.get('new_password') as string : '';
  const confirmPassword = typeof form.get('confirm_password') === 'string' ? form.get('confirm_password') as string : '';

  const redirect = new URL('/perfil/editar?tab=seguridad', env.PUBLIC_SITE_URL);

  if (newPassword.length < 8) {
    return fail(redirect, 'password_too_short');
  }
  if (newPassword !== confirmPassword) {
    return fail(redirect, 'password_mismatch');
  }
  if (!currentPassword) {
    return fail(redirect, 'password_required');
  }

  // Verify current password by attempting sign-in
  const verifyRes = await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.PUBLIC_SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: (session.user as Record<string, unknown>)?.email as string ?? '', password: currentPassword }),
  });
  if (!verifyRes.ok) {
    return fail(redirect, 'wrong_password');
  }

  // Update password via admin API
  const userId = (session.user as Record<string, unknown>)?.id as string;
  const adminRes = await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!adminRes.ok) {
    console.error('[change-password] admin API failed');
    return fail(redirect, 'password_change_failed');
  }

  redirect.searchParams.set('success', 'password_changed');
  return new Response(null, { status: 303, headers: { Location: redirect.pathname + redirect.search } });
};
