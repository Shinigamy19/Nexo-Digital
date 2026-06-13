export const prerender = false;

import type { APIRoute } from 'astro';
import type { SessionUser } from '../../types/database';
import { isSameOrigin, isValidUsername } from '../../lib/security';
import { env } from '../../lib/env';
import { prisma } from '../../lib/prisma';

const PREDEFINED_DISCIPLINES = [
  'Desarrollo',
  'Diseño y 3D',
  'Edición y video',
  'Audio y Producción',
  'IA y herramientas',
  'Domótica / IoT / Hardware',
  'Game Design',
  'Cyberseguridad',
  'Recruiter',
];

function trim(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function emptyToNull(value: string): string | null {
  return value.length === 0 ? null : value;
}

function validateUrl(value: string | null): boolean {
  if (value === null) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = context.locals.user as SessionUser | null;
  if (!user) {
    return context.redirect('/login', 303);
  }

  const form = await context.request.formData();

  const username = trim(form.get('username'));
  const displayName = trim(form.get('display_name'));
  const avatarUrl = trim(form.get('avatar_url'));
  const bio = trim(form.get('bio'));
  const skillsRaw = trim(form.get('skills'));
  const website = trim(form.get('website'));
  const github = trim(form.get('github'));
  const behance = trim(form.get('behance'));
  const substack = trim(form.get('substack'));
  const itch = trim(form.get('itch'));
  const youtube = trim(form.get('youtube'));
  const linkedin = trim(form.get('linkedin'));
  const twitter = trim(form.get('twitter'));
  const tiktok = trim(form.get('tiktok'));
  const instagram = trim(form.get('instagram'));
  const linktree = trim(form.get('linktree'));
  const showEmail = form.get('show_email') === 'on';

  if (!isValidUsername(username)) {
    return context.redirect('/perfil/editar?error=username_invalid', 303);
  }

  if (bio.length > 500) {
    return context.redirect('/perfil/editar?error=bio_too_long', 303);
  }

  const urlFields = { avatarUrl, website, github, behance, substack, itch, youtube, linkedin, twitter, tiktok, instagram, linktree };
  for (const value of Object.values(urlFields)) {
    if (!validateUrl(value === '' ? null : value)) {
      return context.redirect('/perfil/editar?error=invalid_url', 303);
    }
  }

  const existing = await prisma.profile.findFirst({
    where: { username, NOT: { id: user.id } },
    select: { id: true },
  });

  if (existing) {
    return context.redirect('/perfil/editar?error=username_taken', 303);
  }

  const skills = skillsRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const disciplinesRaw = form.getAll('disciplines');
  const customRaw = form.getAll('custom_disciplines');
  const disciplines = [
    ...disciplinesRaw.filter((v): v is string => typeof v === 'string' && PREDEFINED_DISCIPLINES.includes(v)),
    ...customRaw.filter((v): v is string => typeof v === 'string').map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 60),
  ];
  const uniqueDisciplines = [...new Set(disciplines)].slice(0, 10);

  const data = {
    username,
    displayName: emptyToNull(displayName),
    avatarUrl: emptyToNull(avatarUrl),
    bio: emptyToNull(bio),
    discipline: uniqueDisciplines,
    skills,
    website: emptyToNull(website),
    github: emptyToNull(github),
    behance: emptyToNull(behance),
    substack: emptyToNull(substack),
    itch: emptyToNull(itch),
    youtube: emptyToNull(youtube),
    linkedin: emptyToNull(linkedin),
    twitter: emptyToNull(twitter),
    tiktok: emptyToNull(tiktok),
    instagram: emptyToNull(instagram),
    linktree: emptyToNull(linktree),
    showEmail,
  };

  try {
    await prisma.profile.upsert({
      where: { id: user.id },
      create: { id: user.id, ...data },
      update: data,
    });
  } catch {
    return context.redirect('/perfil/editar?error=generic', 303);
  }

  return context.redirect('/perfil/editar?success=1', 303);
};
