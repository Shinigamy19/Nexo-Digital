export const prerender = false;

import type { APIRoute } from 'astro';
import { getAuthSession } from '../../../lib/auth-cookie';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';

const ALLOWED_PROVIDERS = new Set(['google', 'github', 'discord']);

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const session = getAuthSession(context.cookies, context.request);
  if (!session?.access_token) {
    return context.redirect('/perfil/editar?tab=seguridad&error=unlink_failed', 303);
  }

  const form = await context.request.formData();
  const provider = String(form.get('provider') ?? '');
  const hasPassword = form.get('has_password') === 'true';
  const providerCount = parseInt(String(form.get('provider_count') ?? '0'), 10);

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return context.redirect('/perfil/editar?tab=seguridad&error=generic', 303);
  }

  if (!hasPassword && providerCount <= 1) {
    return context.redirect('/perfil/editar?tab=seguridad&error=cannot_unlink_last', 303);
  }

  try {
    const supabaseUrl = env.PUBLIC_SUPABASE_URL;

    // List user identities via Supabase REST API
    const idRes = await fetch(`${supabaseUrl}/auth/v1/user/identities`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.PUBLIC_SUPABASE_ANON_KEY,
      },
    });

    if (!idRes.ok) {
      return context.redirect('/perfil/editar?tab=seguridad&error=unlink_failed', 303);
    }

    const { identities } = await idRes.json() as { identities: Array<{ id: string; provider: string }> };
    const identity = identities?.find((id) => id.provider === provider);

    if (!identity) {
      return context.redirect('/perfil/editar?tab=seguridad&error=provider_not_found', 303);
    }

    // Unlink the identity via DELETE
    const delRes = await fetch(`${supabaseUrl}/auth/v1/user/identities/${identity.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.PUBLIC_SUPABASE_ANON_KEY,
      },
    });

    if (!delRes.ok) {
      return context.redirect('/perfil/editar?tab=seguridad&error=unlink_failed', 303);
    }

    return context.redirect('/perfil/editar?tab=seguridad&success=provider_unlinked', 303);
  } catch {
    return context.redirect('/perfil/editar?tab=seguridad&error=unlink_failed', 303);
  }
};
