export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';

export const POST: APIRoute = async (context) => {
  // CSRF: same-origin check.
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();

  if (!email || !email.includes('@')) {
    return context.redirect('/recuperar?error=invalid_email', 303);
  }

  const { supabase, headers } = createSupabaseServerClient(context);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.PUBLIC_SITE_URL}/auth/confirm?type=recovery&next=${encodeURIComponent('/perfil')}`,
  });

  // Don't leak whether the email exists: always show the "sent" state.
  if (error) {
    console.error('password recovery failed');
  }

  const response = context.redirect('/recuperar?sent=1', 303);
  for (const [key, value] of headers.entries()) {
    response.headers.append(key, value);
  }
  return response;
};
