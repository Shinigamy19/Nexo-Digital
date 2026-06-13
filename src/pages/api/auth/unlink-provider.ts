export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { prisma } from '../../../lib/prisma';

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const form = await context.request.formData();
  const provider = String(form.get('provider') ?? '');
  const hasPassword = form.get('has_password') === 'true';
  const providerCount = parseInt(String(form.get('provider_count') ?? '0'), 10);

  const ALLOWED_PROVIDERS = new Set(['google', 'github', 'discord']);
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return context.redirect('/perfil/editar?tab=seguridad&error=generic', 303);
  }

  // Can't unlink if it's the only auth method
  if (!hasPassword && providerCount <= 1) {
    return context.redirect('/perfil/editar?tab=seguridad&error=cannot_unlink_last', 303);
  }

  try {
    const admin = createSupabaseAdminClient();

    // Get the identity ID for this provider
    const { data: identities, error: idError } = await admin.auth.admin.listUserIdentities(user.id);

    if (idError || !identities) {
      return context.redirect('/perfil/editar?tab=seguridad&error=unlink_failed', 303);
    }

    // Find the identity for this provider
    const identity = identities.find((id) => id.provider === provider);
    if (!identity) {
      return context.redirect('/perfil/editar?tab=seguridad&error=provider_not_found', 303);
    }

    // Unlink the provider by deleting the identity
    const { error: unlinkError } = await admin.auth.admin.unlinkIdentity(user.id, identity.identity_id);

    if (unlinkError) {
      return context.redirect('/perfil/editar?tab=seguridad&error=unlink_failed', 303);
    }

    return context.redirect('/perfil/editar?tab=seguridad&success=provider_unlinked', 303);
  } catch {
    return context.redirect('/perfil/editar?tab=seguridad&error=unlink_failed', 303);
  }
};
