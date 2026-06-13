export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin, safeRedirect } from '../../../lib/security';
import { env } from '../../../lib/env';
import {
  generatePkceVerifier,
  generatePkceChallenge,
  codeVerifierCookieName,
  buildOAuthAuthorizeUrl,
} from '../../../lib/auth-cookie';

const ALLOWED_PROVIDERS = new Set(['google', 'github', 'discord']);

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await context.request.formData();
  const provider = String(form.get('provider') ?? '');
  const next = safeRedirect(context.url.searchParams.get('next') ?? '');
  const linking = form.get('linking') === 'true';

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return context.redirect('/login?error=oauth_failed', 303);
  }

  const redirectTo = `${env.PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}${linking ? '&linking=true' : ''}`;

  const codeVerifier = generatePkceVerifier();
  const codeChallenge = await generatePkceChallenge(codeVerifier);

  // Store code verifier in cookie for the callback to use
  const secure = env.PUBLIC_SITE_URL.startsWith('https');
  const cookieValue = encodeURIComponent(codeVerifier);
  const cookieHeader = `${codeVerifierCookieName()}=${cookieValue}; Path=/; SameSite=Lax; Max-Age=300; HttpOnly${secure ? '; Secure' : ''}`;

  const oauthUrl = buildOAuthAuthorizeUrl(provider, redirectTo, codeChallenge);

  return new Response(null, {
    status: 303,
    headers: { Location: oauthUrl, 'Set-Cookie': cookieHeader },
  });
};
