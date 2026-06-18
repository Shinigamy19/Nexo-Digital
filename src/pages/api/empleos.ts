export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin, publicErrorCode } from '../../lib/security';
import { env } from '../../lib/env';
import { prisma, toPrismaJobCategory, toPrismaJobModality } from '../../lib/prisma';
import {
  LIMITS,
  formValue,
  parseEnum,
  parseInt,
  parseOptionalText,
  parseStringList,
  parseText,
} from '../../lib/validation';
import type { JobCategory, JobModality } from '../../types/database';

const JOB_CATEGORIES: readonly JobCategory[] = [
  'desarrollo', 'diseño', 'ia', 'edicion', 'audio', 'marketing', 'rrhh',
];

const JOB_MODALITIES: readonly JobModality[] = ['remoto', 'hibrido', 'presencial'];

const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'MXN', 'CLP', 'COP', 'PEN'] as const;

function fail(url: URL, code: string, field?: string): Response {
  const redirect = new URL('/empleos/nuevo', url);
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

  const company = parseText(formValue(form, 'company'), 1, LIMITS.MAX_COMPANY_LENGTH);
  if (!company) return fail(context.url, 'invalid_company', 'company');

  const description = parseText(formValue(form, 'description'), 20, LIMITS.MAX_DESC_LENGTH);
  if (!description) return fail(context.url, 'invalid_description', 'description');

  const requirements = parseStringList(formValue(form, 'requirements'));
  if (requirements.length === 0) {
    return fail(context.url, 'invalid_requirements', 'requirements');
  }

  const experience = parseOptionalText(formValue(form, 'experience'), 60);

  const modality = parseEnum(formValue(form, 'modality'), JOB_MODALITIES);
  if (!modality) return fail(context.url, 'invalid_modality', 'modality');

  const category = parseEnum(formValue(form, 'category'), JOB_CATEGORIES);
  if (!category) return fail(context.url, 'invalid_category', 'category');

  const salaryMinRaw = parseInt(formValue(form, 'salary_min'));
  if (salaryMinRaw === undefined) {
    return fail(context.url, 'invalid_salary', 'salary_min');
  }
  const salaryMaxRaw = parseInt(formValue(form, 'salary_max'));
  if (salaryMaxRaw === undefined) {
    return fail(context.url, 'invalid_salary', 'salary_max');
  }
  if (salaryMinRaw !== null && salaryMaxRaw !== null && salaryMinRaw > salaryMaxRaw) {
    return fail(context.url, 'invalid_salary_range', 'salary_min');
  }

  const currency = (() => {
    const raw = (formValue(form, 'currency') ?? '').toUpperCase();
    return CURRENCIES.includes(raw as (typeof CURRENCIES)[number]) ? raw : null;
  })();

  const contact = parseText(formValue(form, 'contact'), 4, LIMITS.MAX_CONTACT_LENGTH);
  if (!contact) return fail(context.url, 'invalid_contact', 'contact');

  const location = parseOptionalText(formValue(form, 'location'), LIMITS.MAX_LOCATION_LENGTH);

  const expiresAtRaw = parseOptionalText(formValue(form, 'expires_at'), 20);
  let expiresAt: Date | null = null;
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw);
    if (!Number.isNaN(d.getTime())) expiresAt = d;
  }

  let job;
  try {
    job = await prisma.job.create({
      data: {
        authorId: user.id,
        isSystem: false,
        title,
        company,
        description,
        requirements,
        experience,
        modality: toPrismaJobModality(modality) as any,
        category: toPrismaJobCategory(category) as any,
        salaryMin: salaryMinRaw,
        salaryMax: salaryMaxRaw,
        currency,
        contact,
        location,
        expiresAt,
        status: 'pending',
      },
      select: { id: true },
    });
  } catch (err) {
    console.error('[jobs insert]', publicErrorCode(String(err)));
    return fail(context.url, 'submission_failed');
  }

  const redirect = new URL('/mis-envios', context.url);
  redirect.searchParams.set('created', 'job');
  redirect.searchParams.set('id', job.id);
  return new Response(null, { status: 303, headers: { Location: redirect.pathname + redirect.search } });
};
