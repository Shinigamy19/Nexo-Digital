export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin, publicErrorCode } from '../../lib/security';
import { env } from '../../lib/env';
import { prisma, toPrismaResourceCategory, toPrismaResourceType } from '../../lib/prisma';
import {
  LIMITS,
  formValue,
  parseEnum,
  parseStringList,
  parseText,
} from '../../lib/validation';
import type { ResourceCategory, ResourceType } from '../../types/database';

const RESOURCE_TYPES: readonly ResourceType[] = [
  'herramienta', 'tutorial', 'recurso', 'template', 'documentacion',
];

const RESOURCE_CATEGORIES: readonly ResourceCategory[] = [
  'desarrollo', 'diseño', 'ia', 'marketing', 'audio', 'edicion', 'negocios', 'aprendizaje', 'iot',
];

function fail(url: URL, code: string, field?: string): Response {
  const redirect = new URL('/recursos/nuevo', url);
  if (field) redirect.searchParams.set('field', field);
  redirect.searchParams.set('error', code);
  return new Response(null, { status: 303, headers: { Location: redirect.pathname + redirect.search } });
}

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const form = await context.request.formData();

  const title = parseText(formValue(form, 'title'), LIMITS.MIN_TITLE_LENGTH, LIMITS.MAX_TITLE_LENGTH);
  if (!title) return fail(context.url, 'invalid_title', 'title');

  const description = parseText(formValue(form, 'description'), 20, LIMITS.MAX_DESC_LENGTH);
  if (!description) return fail(context.url, 'invalid_description', 'description');

  const type = parseEnum(formValue(form, 'type'), RESOURCE_TYPES);
  if (!type) return fail(context.url, 'invalid_type', 'type');

  const category = parseEnum(formValue(form, 'category'), RESOURCE_CATEGORIES);
  if (!category) return fail(context.url, 'invalid_category', 'category');

  const resourceUrl = parseText(formValue(form, 'url'), LIMITS.MIN_URL_LENGTH, LIMITS.MAX_URL_LENGTH);
  if (!resourceUrl) return fail(context.url, 'invalid_url', 'url');

  try { new URL(resourceUrl); } catch { return fail(context.url, 'invalid_url', 'url'); }

  const tags = parseStringList(formValue(form, 'tags'));

  const addedBy = parseText(formValue(form, 'added_by'), 1, LIMITS.MAX_COMPANY_LENGTH);
  if (!addedBy) return fail(context.url, 'invalid_added_by', 'added_by');

  const mediaUrls: string[] = [];
  const rawUrls = form.getAll('media_urls');
  for (const raw of rawUrls) {
    if (typeof raw !== 'string') continue;
    const u = raw.trim();
    if (!u) continue;
    try { new URL(u); } catch { continue; }
    mediaUrls.push(u);
    if (mediaUrls.length >= 5) break;
  }

  let resource;
  try {
    resource = await prisma.resource.create({
      data: {
        authorId: user.id,
        isSystem: false,
        title,
        description,
        type: toPrismaResourceType(type) as any,
        category: toPrismaResourceCategory(category) as any,
        url: resourceUrl,
        mediaUrls,
        tags,
        addedBy,
        status: 'pending',
      },
      select: { id: true },
    });
  } catch (err) {
    console.error('[resources insert]', publicErrorCode(String(err)));
    return fail(context.url, 'submission_failed');
  }

  const redirect = new URL('/mis-envios', context.url);
  redirect.searchParams.set('created', 'resource');
  redirect.searchParams.set('id', resource.id);
  return new Response(null, { status: 303, headers: { Location: redirect.pathname + redirect.search } });
};
