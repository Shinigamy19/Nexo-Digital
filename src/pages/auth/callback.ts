export const prerender = false;

import type { APIRoute } from 'astro';
import {
  buildSetCookieHeader,
  exchangePkceCodeForSession,
  codeVerifierCookieName,
} from '../../lib/auth-cookie';
import { prisma } from '../../lib/prisma';

export const GET: APIRoute = async (context) => {
  try {
    const code = context.url.searchParams.get('code');
    const nextParam = context.url.searchParams.get('next') ?? '/perfil';
    const next = nextParam.startsWith('/') ? nextParam : '/perfil';
    const linking = context.url.searchParams.get('linking') === 'true';

    if (!code) {
      return context.redirect('/auth/error?reason=missing_code', 303);
    }

    const codeVerifier = context.cookies.get(codeVerifierCookieName())?.value;
    if (!codeVerifier) {
      return context.redirect('/auth/error?reason=missing_code_verifier', 303);
    }

  const { session: rawSession, error } = await exchangePkceCodeForSession(code, codeVerifier);

  if (error) {
    return context.redirect(
      `/auth/error?reason=${encodeURIComponent(error)}`,
      303,
    );
  }

  if (!rawSession) {
    return context.redirect('/auth/error?reason=no_session', 303);
  }

  const sessionUser = rawSession.user;
  const userId = sessionUser?.id as string | undefined;
  const email = sessionUser?.email as string | null;
  const userMeta = (sessionUser?.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (sessionUser?.app_metadata ?? {}) as Record<string, unknown>;

  function extractUsername(meta: Record<string, unknown>, provider: string): string {
    if (provider === 'github' && typeof meta.user_name === 'string') return meta.user_name;
    if (provider === 'github' && typeof meta.preferred_username === 'string') return meta.preferred_username;
    if (provider === 'discord' && typeof meta.full_name === 'string') return meta.full_name;
    if (provider === 'google' && typeof meta.full_name === 'string') return meta.full_name;
    if (typeof meta.username === 'string') return meta.username;
    if (typeof meta.name === 'string') return meta.name;
    if (typeof meta.preferred_username === 'string') return meta.preferred_username;
    if (email) return email.split('@')[0];
    return `user_${(userId ?? '').slice(0, 8)}`;
  }

  function extractAvatar(meta: Record<string, unknown>): string | null {
    if (typeof meta.avatar_url === 'string') return meta.avatar_url;
    if (typeof meta.picture === 'string') return meta.picture;
    if (typeof meta.avatar === 'string') return meta.avatar;
    return null;
  }

  const provider = (appMeta.provider as string) ?? 'unknown';
  const rawUsername = extractUsername(userMeta, provider);
  const avatarUrl = extractAvatar(userMeta);

  if (!userId) {
    return context.redirect('/auth/error?reason=no_user_id', 303);
  }

  let profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });

  if (linking && !profile) {
    return context.redirect('/auth/error?reason=linking_failed', 303);
  }

  if (!profile) {
    if (email) {
      const existingUserByEmail = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM auth.users WHERE email = ${email} AND id != ${userId}::uuid LIMIT 1
      `;

      if (existingUserByEmail.length > 0) {
        return context.redirect('/auth/error?reason=email_conflict', 303);
      }
    }

    let username = rawUsername.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    if (username.length < 3) username = `user_${username}`;
    if (username.length > 30) username = username.slice(0, 30);

    let finalUsername = username;
    let counter = 1;
    while (counter < 100) {
      const existing = await prisma.profile.findUnique({
        where: { username: finalUsername },
        select: { id: true },
      });
      if (!existing || existing.id === userId) break;
      finalUsername = `${username}_${counter}`;
      counter++;
    }

    try {
      profile = await prisma.profile.create({
        data: {
          id: userId,
          username: finalUsername,
          displayName: (userMeta.full_name as string) ?? (userMeta.name as string) ?? finalUsername,
          avatarUrl: avatarUrl,
          role: 'user',
        },
      });
    } catch (e) {
      profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      });
      if (!profile) {
        return context.redirect('/auth/error?reason=profile_creation_failed', 303);
      }
    }
  }
  // Profile exists — don't overwrite avatar, respect what the user already set

  const session = {
    access_token: rawSession.access_token,
    refresh_token: rawSession.refresh_token,
    expires_at: rawSession.expires_at!,
    expires_in: rawSession.expires_in!,
    token_type: rawSession.token_type,
    user: sessionUser as unknown as Record<string, unknown> | null,
  };
  const cookieHeader = buildSetCookieHeader(session);
  return new Response(null, {
    status: 303,
    headers: { Location: next, 'Set-Cookie': cookieHeader },
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return context.redirect(`/auth/error?reason=${encodeURIComponent(msg)}`, 303);
  }
};
