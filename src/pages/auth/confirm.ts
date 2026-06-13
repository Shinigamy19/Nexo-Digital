export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { env } from '../../lib/env';
import { buildSetCookieHeader } from '../../lib/auth-cookie';

export const GET: APIRoute = async (context) => {
  const tokenHash = context.url.searchParams.get('token_hash');
  const type = context.url.searchParams.get('type') ?? 'email';
  const next = context.url.searchParams.get('next') ?? '/perfil';

  if (!tokenHash) {
    return context.redirect('/auth/error?reason=missing_token', 303);
  }

  // Use plain createClient — no PKCE needed for OTP verification
  const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.verifyOtp({
    type: type as 'email' | 'magiclink' | 'signup' | 'recovery',
    token_hash: tokenHash,
  });

  if (error) {
    return context.redirect(`/auth/error?reason=${encodeURIComponent(error.message)}`, 303);
  }

  if (data?.session) {
    const session = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at!,
      expires_in: data.session.expires_in!,
      token_type: data.session.token_type,
      user: data.session.user as unknown as Record<string, unknown> | null,
    };
    const cookieHeader = buildSetCookieHeader(session);
    return new Response(null, {
      status: 303,
      headers: { Location: next, 'Set-Cookie': cookieHeader },
    });
  }

  return context.redirect(next, 303);
};
