export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { isAdmin } from '../../../lib/roles';
import { prisma } from '../../../lib/prisma';
import type { UserRole } from '../../../types/database';

const VALID_ROLES: UserRole[] = ['user', 'moderator', 'admin'];

export const GET: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user || !isAdmin(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const q = context.url.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, parseInt(context.url.searchParams.get('page') ?? '1', 10) || 1);
  const perPage = 30;
  const skip = (page - 1) * perPage;

  const where = q
    ? {
        OR: [
          { username: { contains: q, mode: 'insensitive' as const } },
          { displayName: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.profile.count({ where }),
  ]);

  return new Response(JSON.stringify({
    users: profiles.map((p: any) => ({
      id: p.id,
      username: p.username,
      display_name: p.displayName,
      avatar_url: p.avatarUrl,
      role: p.role,
      created_at: p.createdAt.toISOString(),
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user || !isAdmin(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const form = await context.request.formData();
  const targetId = form.get('user_id')?.toString().trim() ?? '';
  const newRole = form.get('role')?.toString().trim() ?? '';

  if (!targetId || targetId.length < 8 || targetId.length > 64) {
    return new Response(JSON.stringify({ error: 'invalid_user_id' }), { status: 400 });
  }
  if (!VALID_ROLES.includes(newRole as UserRole)) {
    return new Response(JSON.stringify({ error: 'invalid_role' }), { status: 400 });
  }

  // Prevent self-demotion
  if (targetId === user.id) {
    return new Response(JSON.stringify({ error: 'cannot_change_own_role' }), { status: 400 });
  }

  try {
    await prisma.profile.update({
      where: { id: targetId },
      data: { role: newRole as UserRole },
    });
  } catch {
    console.error('[admin:role] update failed');
    return new Response(JSON.stringify({ error: 'update_failed' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
