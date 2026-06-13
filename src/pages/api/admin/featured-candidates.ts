export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { isModerator } from '../../../lib/roles';
import { prisma } from '../../../lib/prisma';
import { formValue, parseText, parseOptionalText, parseStringList, parseInt, parseEnum } from '../../../lib/validation';
import type { ModerationStatus } from '@prisma/client';

export const GET: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user || !isModerator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const candidates = await prisma.featuredCandidate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return new Response(JSON.stringify(candidates), {
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
  const name = parseText(formValue(form, 'name'), 2, 120);
  if (!name) return new Response(JSON.stringify({ error: 'invalid_name' }), { status: 400 });

  const role = parseText(formValue(form, 'role'), 2, 120);
  if (!role) return new Response(JSON.stringify({ error: 'invalid_role' }), { status: 400 });

  const bio = parseText(formValue(form, 'bio'), 10, 500);
  if (!bio) return new Response(JSON.stringify({ error: 'invalid_bio' }), { status: 400 });

  const tags = parseStringList(formValue(form, 'tags'));
  if (tags.length === 0) return new Response(JSON.stringify({ error: 'invalid_tags' }), { status: 400 });

  const availability = parseText(formValue(form, 'availability'), 2, 50);
  if (!availability) return new Response(JSON.stringify({ error: 'invalid_availability' }), { status: 400 });

  const topSkill = parseText(formValue(form, 'top_skill'), 2, 80);
  if (!topSkill) return new Response(JSON.stringify({ error: 'invalid_top_skill' }), { status: 400 });

  // Handle image: file upload → base64, or select value → filename
  const imageFile = form.get('image');
  let image: string | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    const buf = Buffer.from(await imageFile.arrayBuffer());
    image = `data:${imageFile.type || 'image/png'};base64,${buf.toString('base64')}`;
  } else if (typeof imageFile === 'string') {
    image = parseText(imageFile, 2, 500);
  }
  if (!image) return new Response(JSON.stringify({ error: 'invalid_image' }), { status: 400 });

  const sortOrderRaw = parseInt(formValue(form, 'sort_order'));
  const sortOrder = sortOrderRaw === null || sortOrderRaw === undefined ? 0 : sortOrderRaw;
  const motivation = parseOptionalText(formValue(form, 'motivation'), 2000);

  try {
    const candidate = await prisma.featuredCandidate.create({
      data: { name, role, bio, tags, availability, topSkill, image, sortOrder, motivation, status: 'approved', isActive: true },
    });
    return new Response(JSON.stringify(candidate), {
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

  const name = parseOptionalText(formValue(form, 'name'), 120);
  const role = parseOptionalText(formValue(form, 'role'), 120);
  const bio = parseOptionalText(formValue(form, 'bio'), 500);
  const tagsRaw = formValue(form, 'tags');
  const availability = parseOptionalText(formValue(form, 'availability'), 50);
  const topSkill = parseOptionalText(formValue(form, 'top_skill'), 80);
  const isActiveRaw = formValue(form, 'is_active');
  const sortOrderRaw = parseInt(formValue(form, 'sort_order'));
  const motivation = parseOptionalText(formValue(form, 'motivation'), 2000);
  const status = parseEnum(formValue(form, 'status'), ['pending', 'approved', 'rejected', 'removed'] as const);
  const moderationNotes = parseOptionalText(formValue(form, 'moderation_notes'), 500);

  // Handle image: file upload → base64, or string → filename/URL
  const imageField = form.get('image');
  let image: string | null | undefined = undefined;
  if (imageField instanceof File && imageField.size > 0) {
    const buf = Buffer.from(await imageField.arrayBuffer());
    image = `data:${imageField.type || 'image/png'};base64,${buf.toString('base64')}`;
  } else if (typeof imageField === 'string' && imageField) {
    image = imageField;
  }

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (role) data.role = role;
  if (bio) data.bio = bio;
  if (tagsRaw) data.tags = parseStringList(tagsRaw);
  if (availability) data.availability = availability;
  if (topSkill) data.topSkill = topSkill;
  if (image !== undefined) data.image = image;
  if (isActiveRaw !== null) data.isActive = isActiveRaw === 'true' || isActiveRaw === '1';
  if (sortOrderRaw !== undefined && sortOrderRaw !== null) data.sortOrder = sortOrderRaw;
  if (motivation) data.motivation = motivation;
  if (status) {
    data.status = status;
    data.moderatorId = user.profile?.id ?? user.id;
    data.moderatedAt = new Date();
  }
  if (moderationNotes) data.moderationNotes = moderationNotes;

  try {
    const candidate = await prisma.featuredCandidate.update({
      where: { id },
      data,
    });
    return new Response(JSON.stringify(candidate), {
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
    await prisma.featuredCandidate.delete({ where: { id } });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'delete_failed' }), { status: 500 });
  }
};
