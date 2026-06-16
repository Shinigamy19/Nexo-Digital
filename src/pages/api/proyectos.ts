export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin, publicErrorCode } from '../../lib/security';
import { env } from '../../lib/env';
import { prisma, toPrismaProjectCategory, toPrismaProjectType } from '../../lib/prisma';
import {
  LIMITS,
  formValue,
  parseBool,
  parseEnum,
  parseOptionalText,
  parseStringList,
  parseText,
} from '../../lib/validation';
import type { ProjectCategory, ProjectStatusKind, ProjectType } from '../../types/database';

const PROJECT_TYPES: readonly ProjectType[] = ['desarrollo', 'audiovisual'];

const DEV_CATEGORIES: readonly ProjectCategory[] = [
  'desarrollo', 'ia', 'iot', 'gamedev',
];

const AUDIO_CATEGORIES: readonly ProjectCategory[] = [
  'diseño', 'edicion', 'audio',
];

const PROJECT_STATUSES: readonly ProjectStatusKind[] = ['activo', 'en_progreso', 'finalizado'];

function fail(url: URL, code: string, field?: string): Response {
  const redirect = new URL('/proyectos/nuevo', url);
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

  const projectType = parseEnum(formValue(form, 'project_type'), PROJECT_TYPES) ?? 'desarrollo';

  const title = parseText(formValue(form, 'title'), LIMITS.MIN_TITLE_LENGTH, LIMITS.MAX_TITLE_LENGTH);
  if (!title) return fail(context.url, 'invalid_title', 'title');

  const description = parseText(formValue(form, 'description'), 20, LIMITS.MAX_DESC_LENGTH);
  if (!description) return fail(context.url, 'invalid_description', 'description');

  const allowedCategories = projectType === 'audiovisual' ? AUDIO_CATEGORIES : DEV_CATEGORIES;
  const category = parseEnum(formValue(form, 'category'), allowedCategories);
  if (!category) return fail(context.url, 'invalid_category', 'category');

  const technologies = parseStringList(formValue(form, 'technologies'));
  if (technologies.length === 0) {
    return fail(context.url, 'invalid_technologies', 'technologies');
  }

  const author = parseText(formValue(form, 'author'), 1, LIMITS.MAX_COMPANY_LENGTH);
  if (!author) return fail(context.url, 'invalid_author', 'author');

  const authorGithub = parseOptionalText(formValue(form, 'author_github'), LIMITS.MAX_COMPANY_LENGTH);

  let repo: string | null = null;
  let demo: string | null = null;

  if (projectType === 'desarrollo') {
    repo = parseOptionalText(formValue(form, 'repo'), LIMITS.MAX_URL_LENGTH);
    demo = parseOptionalText(formValue(form, 'demo'), LIMITS.MAX_URL_LENGTH);

    if (repo) {
      try { new URL(repo); } catch { return fail(context.url, 'invalid_repo', 'repo'); }
    }
    if (demo) {
      try { new URL(demo); } catch { return fail(context.url, 'invalid_demo', 'demo'); }
    }
  }

  let mediaUrls: string[] = [];
  if (projectType === 'audiovisual') {
    const rawUrls = form.getAll('media_urls');
    for (const raw of rawUrls) {
      if (typeof raw !== 'string') continue;
      const url = raw.trim();
      if (!url) continue;
      try { new URL(url); } catch { continue; }
      mediaUrls.push(url);
      if (mediaUrls.length >= 5) break;
    }
    if (mediaUrls.length === 0) {
      return fail(context.url, 'invalid_media_urls', 'media_urls');
    }
  }

  const socialLinks: Array<{ platform: string; value: string }> = [];
  const platforms = form.getAll('social_platform');
  const values = form.getAll('social_value');
  const SOCIAL_ALLOWED = ['github', 'behance', 'itchio', 'youtube', 'twitter', 'instagram', 'linkedin', 'tiktok', 'portfolio'];
  for (let i = 0; i < platforms.length && i < values.length && socialLinks.length < 5; i++) {
    const platform = String(platforms[i]).trim();
    const value = String(values[i]).trim();
    if (!SOCIAL_ALLOWED.includes(platform) || !value) continue;
    socialLinks.push({ platform, value });
  }

  const projectStatus =
    parseEnum(formValue(form, 'project_status') ?? 'activo', PROJECT_STATUSES) ?? 'activo';
  const featured = parseBool(formValue(form, 'featured'));
  const collaborative = parseBool(formValue(form, 'collaborative'));

  let project;
  try {
    project = await prisma.project.create({
      data: {
        authorId: user.id,
        isSystem: false,
        projectType: toPrismaProjectType(projectType) as any,
        title,
        description,
        category: toPrismaProjectCategory(category) as any,
        technologies,
        mediaUrls,
        socialLinks: JSON.stringify(socialLinks),
        authorName: author,
        authorGithub,
        repo,
        demo,
        projectStatus,
        collaborative,
        featured,
        status: 'pending',
      },
      select: { id: true },
    });
  } catch (err) {
    console.error('[projects insert]', publicErrorCode(String(err)));
    return fail(context.url, 'submission_failed');
  }

  const redirect = new URL('/mis-envios', context.url);
  redirect.searchParams.set('created', 'project');
  redirect.searchParams.set('id', project.id);
  return new Response(null, { status: 303, headers: { Location: redirect.pathname + redirect.search } });
};
