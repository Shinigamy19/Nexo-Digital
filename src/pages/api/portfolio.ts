export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin, publicErrorCode } from '../../lib/security';
import { env } from '../../lib/env';
import { prisma, toPrismaProjectCategory, toPrismaProjectType } from '../../lib/prisma';
import {
  LIMITS,
  formValue,
  parseEnum,
  parseOptionalText,
  parseStringList,
  parseText,
} from '../../lib/validation';
import type { ProjectCategory, ProjectType, SocialLink } from '../../types/database';

const CATEGORIES: readonly ProjectCategory[] = [
  'desarrollo', 'diseño', 'ia', 'iot', 'edicion', 'audio', 'gamedev',
];

const PROJECT_TYPES: readonly ProjectType[] = ['desarrollo', 'audiovisual'];

const SOCIAL_PLATFORMS = ['youtube', 'behance', 'instagram', 'vimeo', 'tiktok', 'custom'];

function parseSocialLinks(raw: string | null): SocialLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l: any) => l && typeof l.platform === 'string' && typeof l.value === 'string' && l.value.trim())
      .slice(0, 10)
      .map((l: any) => ({ platform: l.platform, value: l.value.trim() }));
  } catch {
    return [];
  }
}

function jsonError(status: number, code: string) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) return jsonError(403, 'forbidden');

  const user = context.locals.user;
  if (!user) return jsonError(401, 'unauthorized');

  const items = await prisma.portfolioItem.findMany({
    where: { authorId: user.id },
    orderBy: { sortOrder: 'asc' },
  });

  return new Response(JSON.stringify({
    items: items.map((i: any) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      type: i.type,
      category: i.category,
      technologies: i.technologies,
      media_urls: i.mediaUrls,
      social_links: Array.isArray(i.socialLinks) ? i.socialLinks : [],
      repo: i.repo,
      demo: i.demo,
      sort_order: i.sortOrder,
    })),
  }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) return jsonError(403, 'forbidden');

  const user = context.locals.user;
  if (!user) return jsonError(401, 'unauthorized');

  const form = await context.request.formData();

  const title = parseText(formValue(form, 'title'), LIMITS.MIN_TITLE_LENGTH, LIMITS.MAX_TITLE_LENGTH);
  if (!title) return jsonError(400, 'invalid_title');

  const description = parseText(formValue(form, 'description'), 10, LIMITS.MAX_DESC_LENGTH);
  if (!description) return jsonError(400, 'invalid_description');

  const category = parseEnum(formValue(form, 'category'), CATEGORIES);
  if (!category) return jsonError(400, 'invalid_category');

  const projectType = parseEnum(formValue(form, 'type'), PROJECT_TYPES) ?? 'desarrollo';

  const technologies = parseStringList(formValue(form, 'technologies'));
  if (projectType === 'desarrollo' && technologies.length === 0) return jsonError(400, 'invalid_technologies');

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

  const socialLinks = parseSocialLinks(formValue(form, 'social_links'));

  const repo = parseOptionalText(formValue(form, 'repo'), LIMITS.MAX_URL_LENGTH);
  const demo = parseOptionalText(formValue(form, 'demo'), LIMITS.MAX_URL_LENGTH);

  const count = await prisma.portfolioItem.count({ where: { authorId: user.id } });

  try {
    const item = await prisma.portfolioItem.create({
      data: {
        authorId: user.id,
        title,
        description,
        type: toPrismaProjectType(projectType) as any,
        category: toPrismaProjectCategory(category) as any,
        technologies,
        mediaUrls,
        socialLinks: socialLinks as any,
        repo,
        demo,
        sortOrder: count,
      },
      select: { id: true },
    });

    return new Response(JSON.stringify({ id: item.id, success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[portfolio insert]', publicErrorCode(String(err)));
    return jsonError(500, 'submission_failed');
  }
};

export const PUT: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) return jsonError(403, 'forbidden');

  const user = context.locals.user;
  if (!user) return jsonError(401, 'unauthorized');

  const form = await context.request.formData();
  const id = formValue(form, 'id');
  if (!id) return jsonError(400, 'missing_id');

  const existing = await prisma.portfolioItem.findUnique({ where: { id }, select: { authorId: true } });
  if (!existing || existing.authorId !== user.id) return jsonError(403, 'forbidden');

  const title = parseText(formValue(form, 'title'), LIMITS.MIN_TITLE_LENGTH, LIMITS.MAX_TITLE_LENGTH);
  if (!title) return jsonError(400, 'invalid_title');

  const description = parseText(formValue(form, 'description'), 10, LIMITS.MAX_DESC_LENGTH);
  if (!description) return jsonError(400, 'invalid_description');

  const category = parseEnum(formValue(form, 'category'), CATEGORIES);
  if (!category) return jsonError(400, 'invalid_category');

  const projectType = parseEnum(formValue(form, 'type'), PROJECT_TYPES) ?? 'desarrollo';

  const technologies = parseStringList(formValue(form, 'technologies'));

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

  const socialLinks = parseSocialLinks(formValue(form, 'social_links'));

  const repo = parseOptionalText(formValue(form, 'repo'), LIMITS.MAX_URL_LENGTH);
  const demo = parseOptionalText(formValue(form, 'demo'), LIMITS.MAX_URL_LENGTH);

  try {
    await prisma.portfolioItem.update({
      where: { id },
      data: {
        title,
        description,
        type: toPrismaProjectType(projectType) as any,
        category: toPrismaProjectCategory(category) as any,
        technologies,
        mediaUrls,
        socialLinks: socialLinks as any,
        repo,
        demo,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[portfolio update]', publicErrorCode(String(err)));
    return jsonError(500, 'update_failed');
  }
};

export const DELETE: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) return jsonError(403, 'forbidden');

  const user = context.locals.user;
  if (!user) return jsonError(401, 'unauthorized');

  const form = await context.request.formData();
  const id = formValue(form, 'id');
  if (!id) return jsonError(400, 'missing_id');

  const existing = await prisma.portfolioItem.findUnique({ where: { id }, select: { authorId: true } });
  if (!existing || existing.authorId !== user.id) return jsonError(403, 'forbidden');

  try {
    await prisma.portfolioItem.delete({ where: { id } });
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[portfolio delete]', publicErrorCode(String(err)));
    return jsonError(500, 'delete_failed');
  }
};
