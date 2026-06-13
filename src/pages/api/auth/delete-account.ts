export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { getAuthSession, clearAuthSession, buildClearCookieHeader } from '../../../lib/auth-cookie';
import { prisma } from '../../../lib/prisma';

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
  const password = typeof form.get('password') === 'string' ? form.get('password') as string : '';
  const confirm = typeof form.get('confirm_delete') === 'string' ? form.get('confirm_delete') as string : '';

  const redirect = new URL('/perfil/editar?tab=seguridad', env.PUBLIC_SITE_URL);

  if (confirm !== 'ELIMINAR') {
    return fail(redirect, 'delete_not_confirmed');
  }
  if (!password) {
    return fail(redirect, 'password_required');
  }

  // Verify password
  const email = (session.user as Record<string, unknown>)?.email as string ?? '';
  const verifyRes = await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.PUBLIC_SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  if (!verifyRes.ok) {
    return fail(redirect, 'wrong_password');
  }

  const userId = (session.user as Record<string, unknown>)?.id as string;

  // Delete profile from DB first (foreign key constraints)
  try {
    await prisma.profile.delete({ where: { id: userId } });
  } catch {
    // Continue anyway — profile might not exist
  }

  // Delete user from Supabase Auth
  const adminRes = await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: env.PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!adminRes.ok) {
    return fail(redirect, 'delete_failed');
  }

  // Clear session cookie and redirect to home
  clearAuthSession(context.cookies);

  const headers = new Headers();
  headers.set('Location', '/');
  headers.append('Set-Cookie', buildClearCookieHeader());
  return new Response(null, { status: 303, headers });
};
