export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { prisma } from '../../../lib/prisma';
import { formValue, parseText, parseStringList } from '../../../lib/validation';

export const POST: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 });
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

  const motivation = parseText(formValue(form, 'motivation'), 10, 2000);
  if (!motivation) return new Response(JSON.stringify({ error: 'invalid_motivation' }), { status: 400 });

  const imageFile = form.get('image');
  let image = '';
  if (imageFile instanceof File && imageFile.size > 0) {
    const buf = Buffer.from(await imageFile.arrayBuffer());
    image = `data:${imageFile.type || 'image/png'};base64,${buf.toString('base64')}`;
  }

  try {
    const candidate = await prisma.featuredCandidate.create({
      data: {
        name, role, bio, tags, availability, topSkill,
        motivation,
        image,
        isActive: false,
        status: 'pending',
        profileId: user.profile?.id ?? user.id,
      },
    });
    return new Response(JSON.stringify(candidate), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'create_failed' }), { status: 500 });
  }
};
