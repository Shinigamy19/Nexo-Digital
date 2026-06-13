export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from '../../../../lib/env';
import { getAuthSession } from '../../../../lib/auth-cookie';
import { prisma } from '../../../../lib/prisma';
import { createTOTPSecret, generateQRCode, getTOTPUri } from '../../../../lib/two-factor';
import { isSameOrigin } from '../../../../lib/security';

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const session = getAuthSession(context.cookies, context.request);
  if (!session?.access_token) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>)?.id as string;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) {
    return new Response(JSON.stringify({ error: 'profile_not_found' }), { status: 404 });
  }

  if (profile.twoFactorEnabled) {
    return new Response(JSON.stringify({ error: 'already_enabled' }), { status: 400 });
  }

  const email = (session.user as Record<string, unknown>)?.email as string ?? profile.username;
  const { secret, totp } = createTOTPSecret(email);
  const qrDataUrl = await generateQRCode(totp);
  const otpauthUri = getTOTPUri(totp);

  // Store the secret temporarily (not enabled yet — user must verify first)
  await prisma.profile.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  return new Response(JSON.stringify({
    qr: qrDataUrl,
    secret,
    otpauth_uri: otpauthUri,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
