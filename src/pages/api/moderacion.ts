export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../lib/security';
import { env } from '../../lib/env';
import { isModerator } from '../../lib/roles';
import { prisma } from '../../lib/prisma';
import { formValue, parseText, parseEnum } from '../../lib/validation';
import type { ModerationAction, ModerationStatus, PortalType } from '../../types/database';

const PORTAL_TYPES: readonly PortalType[] = ['job', 'resource', 'project', 'event', 'featured'];
const ACTIONS: readonly ModerationAction[] = ['approve', 'reject', 'remove', 'reopen'];

const STATUS_BY_ACTION: Record<ModerationAction, ModerationStatus> = {
  approve: 'approved',
  reject: 'rejected',
  remove: 'removed',
  reopen: 'pending',
};

function fail(tab: string, code: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: `/moderacion?tab=${tab}&error=${code}` },
  });
}

function success(tab: string, action: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: `/moderacion?tab=${tab}&done=${action}&type=${tab}` },
  });
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

  if (!isModerator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const form = await context.request.formData();
  const targetType = parseEnum(formValue(form, 'target_type'), PORTAL_TYPES);
  const targetId = parseText(formValue(form, 'target_id'), 8, 64);
  const action = parseEnum(formValue(form, 'action'), ACTIONS);
  const notesRaw = (formValue(form, 'notes') ?? '').trim();
  const notes = notesRaw ? notesRaw.slice(0, 500) : null;

  const tab = targetType ?? 'job';

  if (!targetType) return fail(tab, 'invalid_target_type');
  if (!targetId) return fail(tab, 'invalid_target_id');
  if (!action) return fail(tab, 'invalid_action');
  if (action === 'reject' && !notes) return fail(tab, 'rejection_reason_required');

  const newStatus = STATUS_BY_ACTION[action];
  const now = new Date();

  const updateData = {
    status: newStatus,
    moderatorId: user.id,
    moderatedAt: now,
    moderationNotes: action === 'reopen' ? null : notes,
  };

  try {
    if (targetType === 'job') {
      await prisma.job.update({
        where: { id: targetId },
        data: updateData,
      });
    } else if (targetType === 'resource') {
      await prisma.resource.update({
        where: { id: targetId },
        data: updateData,
      });
    } else if (targetType === 'project') {
      await prisma.project.update({
        where: { id: targetId },
        data: updateData,
      });
    } else if (targetType === 'event') {
      await prisma.event.update({
        where: { id: targetId },
        data: updateData,
      });
    } else if (targetType === 'featured') {
      await prisma.featuredCandidate.update({
        where: { id: targetId },
        data: {
          ...updateData,
          isActive: action === 'approve',
        },
      });
    }

    await prisma.moderationLog.create({
      data: {
        moderatorId: user.id,
        targetType,
        targetId,
        action,
        notes,
      },
    });
  } catch {
    return fail(tab, 'update_failed');
  }

  return success(tab, action);
};
