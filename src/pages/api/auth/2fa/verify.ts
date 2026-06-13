export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from '../../../../lib/env';
import { getAuthSession } from '../../../../lib/auth-cookie';
import { prisma } from '../../../../lib/prisma';
import { verifyTOTP } from '../../../../lib/two-factor';
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

  const form = await context.request.formData();
  const token = String(form.get('token') ?? '').trim();

  if (!token || token.length !== 6) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) {
    return new Response(JSON.stringify({ error: 'profile_not_found' }), { status: 404 });
  }

  if (profile.twoFactorEnabled) {
    return new Response(JSON.stringify({ error: 'already_enabled' }), { status: 400 });
  }

  if (!profile.twoFactorSecret) {
    return new Response(JSON.stringify({ error: 'setup_required' }), { status: 400 });
  }

  const valid = verifyTOTP(profile.twoFactorSecret, token);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400 });
  }

  await prisma.profile.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
