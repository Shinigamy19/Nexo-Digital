export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from '../../../../lib/env';
import { getTempSession, buildSetCookieHeader, buildClearTempSessionHeader } from '../../../../lib/auth-cookie';
import { prisma } from '../../../../lib/prisma';
import { verifyTOTP } from '../../../../lib/two-factor';
import { isSameOrigin, safeRedirect } from '../../../../lib/security';

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const tempSession = getTempSession(context.cookies, context.request);
  if (!tempSession) {
    return new Response(JSON.stringify({ error: 'session_expired' }), { status: 401 });
  }

  const form = await context.request.formData();
  const token = String(form.get('token') ?? '').trim();
  const next = safeRedirect(String(form.get('next') ?? '/perfil'));

  if (!token || token.length !== 6) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: tempSession.user_id } });
  if (!profile || !profile.twoFactorSecret) {
    return new Response(JSON.stringify({ error: 'invalid_state' }), { status: 400 });
  }

  const valid = verifyTOTP(profile.twoFactorSecret, token);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400 });
  }

  // 2FA verified — promote temp session to full session
  // Use Headers API with append() to send separate Set-Cookie headers
  const headers = new Headers();
  headers.set('Location', next);
  headers.append('Set-Cookie', buildSetCookieHeader(tempSession.session));
  headers.append('Set-Cookie', buildClearTempSessionHeader());

  return new Response(null, { status: 303, headers });
};
