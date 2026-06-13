export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase';
import { getAuthSession, buildClearCookieHeader } from '../../../lib/auth-cookie';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response('Forbidden', { status: 403 });
  }

  const session = getAuthSession(context.cookies);
  if (session) {
    try {
      const supabase = createSupabaseAdminClient();
      const userId = (session.user as Record<string, unknown> | null)?.id;
      if (userId && typeof userId === 'string') {
        await supabase.auth.admin.signOut(userId);
      }
    } catch {
      // Server-side sign-out is best-effort; cookie removal is what matters
    }
  }

  const cookieHeader = buildClearCookieHeader();
  return new Response(null, {
    status: 303,
    headers: { Location: '/', 'Set-Cookie': cookieHeader },
  });
};
