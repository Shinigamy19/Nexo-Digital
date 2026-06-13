export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../lib/security';
import { env } from '../../lib/env';
import { prisma, toPrismaEventCategory } from '../../lib/prisma';
import {
  LIMITS,
  formValue,
  parseEnum,
  parseInt,
  parseOptionalText,
  parseText,
} from '../../lib/validation';
import type { EventCategoryKind, EventTypeKind } from '../../types/database';

const EVENT_TYPES: readonly EventTypeKind[] = ['presencial', 'en_linea', 'hibrido'];

const EVENT_CATEGORIES: readonly EventCategoryKind[] = [
  'conferencia', 'workshop', 'networking', 'hackathon', 'curso', 'encuentro', 'otro',
];

function fail(url: URL, code: string, field?: string): Response {
  const redirect = new URL('/eventos/nuevo', url);
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

  const eventType = parseEnum(formValue(form, 'event_type'), EVENT_TYPES);
  if (!eventType) return fail(context.url, 'invalid_event_type', 'event_type');

  const category = parseEnum(formValue(form, 'category'), EVENT_CATEGORIES);
  if (!category) return fail(context.url, 'invalid_event_category', 'category');

  const startDateRaw = parseOptionalText(formValue(form, 'start_date'), 20);
  if (!startDateRaw) return fail(context.url, 'invalid_start_date', 'start_date');
  const startDate = new Date(startDateRaw);
  if (Number.isNaN(startDate.getTime())) return fail(context.url, 'invalid_start_date', 'start_date');

  const endDateRaw = parseOptionalText(formValue(form, 'end_date'), 20);
  let endDate: Date | null = null;
  if (endDateRaw) {
    endDate = new Date(endDateRaw);
    if (Number.isNaN(endDate.getTime())) return fail(context.url, 'invalid_end_date', 'end_date');
  }

  const startTime = parseOptionalText(formValue(form, 'start_time'), 10);

  const location = parseOptionalText(formValue(form, 'location'), 200);

  const url = parseOptionalText(formValue(form, 'url'), LIMITS.MAX_URL_LENGTH);
  if (url !== null && url.length < LIMITS.MIN_URL_LENGTH) return fail(context.url, 'invalid_url', 'url');

  const contactInfo = parseOptionalText(formValue(form, 'contact_info'), 200);

  const maxParticipantsRaw = parseInt(formValue(form, 'max_participants'));
  if (maxParticipantsRaw === undefined) {
    return fail(context.url, 'invalid_max_participants', 'max_participants');
  }

  let event;
  try {
    event = await prisma.event.create({
      data: {
        authorId: user.id,
        isSystem: false,
        title,
        description,
        eventType,
        category: toPrismaEventCategory(category) as any,
        startDate,
        endDate,
        startTime,
        location,
        url,
        contactInfo,
        maxParticipants: maxParticipantsRaw,
        status: 'pending',
      },
      select: { id: true },
    });
  } catch {
    return fail(context.url, 'submission_failed');
  }

  const redirect = new URL('/mis-envios', context.url);
  redirect.searchParams.set('created', 'event');
  redirect.searchParams.set('id', event.id);
  return new Response(null, { status: 303, headers: { Location: redirect.pathname + redirect.search } });
};
