export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { isModerator } from '../../../lib/roles';
import { prisma } from '../../../lib/prisma';
import { formValue, parseText, parseOptionalText, parseInt } from '../../../lib/validation';

export const GET: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user || !isModerator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const links = await prisma.linkItem.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return new Response(JSON.stringify(links), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user || !isModerator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const form = await context.request.formData();
  const label = parseText(formValue(form, 'label'), 1, 80);
  if (!label) return new Response(JSON.stringify({ error: 'invalid_label' }), { status: 400 });

  const url = parseOptionalText(formValue(form, 'url'), 500) ?? '';
  const icon = parseOptionalText(formValue(form, 'icon'), 500) ?? '';
  const sortOrderRaw = parseInt(formValue(form, 'sort_order'));
  const sortOrder = sortOrderRaw === null || sortOrderRaw === undefined ? 0 : sortOrderRaw;
  const isActive = formValue(form, 'is_active') === 'true' || formValue(form, 'is_active') === '1';

  try {
    const link = await prisma.linkItem.create({
      data: { label, url, icon, sortOrder, isActive },
    });
    return new Response(JSON.stringify(link), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'create_failed' }), { status: 500 });
  }
};

export const PUT: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user || !isModerator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const form = await context.request.formData();
  const id = formValue(form, 'id');
  if (!id) return new Response(JSON.stringify({ error: 'invalid_id' }), { status: 400 });

  const label = parseOptionalText(formValue(form, 'label'), 80);
  const url = parseOptionalText(formValue(form, 'url'), 500);
  const icon = parseOptionalText(formValue(form, 'icon'), 500);
  const sortOrderRaw = parseInt(formValue(form, 'sort_order'));
  const isActiveRaw = formValue(form, 'is_active');

  const data: Record<string, unknown> = {};
  if (label) data.label = label;
  if (url !== null) data.url = url;
  if (icon !== null) data.icon = icon;
  if (sortOrderRaw !== undefined && sortOrderRaw !== null) data.sortOrder = sortOrderRaw;
  if (isActiveRaw !== null) data.isActive = isActiveRaw === 'true' || isActiveRaw === '1';

  try {
    const link = await prisma.linkItem.update({
      where: { id },
      data,
    });
    return new Response(JSON.stringify(link), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'update_failed' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user || !isModerator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const id = context.url.searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'invalid_id' }), { status: 400 });

  try {
    await prisma.linkItem.delete({ where: { id } });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'delete_failed' }), { status: 500 });
  }
};