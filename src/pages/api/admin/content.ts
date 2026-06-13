export const prerender = false;

import type { APIRoute } from 'astro';
import { isSameOrigin } from '../../../lib/security';
import { env } from '../../../lib/env';
import { isModerator } from '../../../lib/roles';
import { prisma } from '../../../lib/prisma';

export const GET: APIRoute = async (context) => {
  if (!isSameOrigin(context.request, env.PUBLIC_SITE_URL)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const user = context.locals.user;
  if (!user || !isModerator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if (!type || !id) return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400 });

  try {
    let item: Record<string, any> | null = null;

    if (type === 'job') {
      item = await prisma.job.findUnique({ where: { id } });
    } else if (type === 'resource') {
      item = await prisma.resource.findUnique({ where: { id } });
    } else if (type === 'project') {
      item = await prisma.project.findUnique({ where: { id } });
    } else if (type === 'event') {
      item = await prisma.event.findUnique({ where: { id } });
    } else if (type === 'featured') {
      item = await prisma.featuredCandidate.findUnique({ where: { id } });
    }

    if (!item) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

    return new Response(JSON.stringify(item), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 500 });
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

  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if (!type || !id) return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400 });

  try {
    if (type === 'job') await prisma.job.delete({ where: { id } });
    else if (type === 'resource') await prisma.resource.delete({ where: { id } });
    else if (type === 'project') await prisma.project.delete({ where: { id } });
    else if (type === 'event') await prisma.event.delete({ where: { id } });
    else if (type === 'featured') await prisma.featuredCandidate.delete({ where: { id } });
    else return new Response(JSON.stringify({ error: 'invalid_type' }), { status: 400 });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'delete_failed' }), { status: 500 });
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
  const type = form.get('type') as string | null;
  const id = form.get('id') as string | null;

  if (!type || !id) {
    return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400 });
  }

  // Build update data from all form fields (exclude type, id)
  const data: Record<string, any> = {};
  for (const [key, val] of form.entries()) {
    if (key === 'type' || key === 'id') continue;
    if (key === 'field' && !form.has('value')) continue;
    data[key] = val;
  }

  // Handle single field toggle (backward compat: field + value)
  const field = form.get('field') as string | null;
  const value = form.get('value') as string | null;
  if (field && value !== null && !data[field]) {
    data[field] = field === 'featured' || field === 'isActive' ? value === 'true' : value;
  }

  // Parse array fields
  const parseArray = (v: FormDataEntryValue | null): string[] | undefined => {
    if (v === null || v === undefined) return undefined;
    const s = typeof v === 'string' ? v : '';
    return s.split(',').map((t: string) => t.trim()).filter(Boolean);
  };

  // Parse number fields
  const parseNum = (v: FormDataEntryValue | null): number | null | undefined => {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  try {
    if (type === 'job') {
      const updateData: Record<string, any> = {};
      if (data.title) updateData.title = data.title;
      if (data.company) updateData.company = data.company;
      if (data.description) updateData.description = data.description;
      if (data.requirements) updateData.requirements = parseArray(data.requirements);
      if (data.modality) updateData.modality = data.modality;
      if (data.category) updateData.category = data.category;
      if (data.salaryMin !== undefined) updateData.salaryMin = parseNum(data.salaryMin);
      if (data.salaryMax !== undefined) updateData.salaryMax = parseNum(data.salaryMax);
      if (data.currency !== undefined) updateData.currency = data.currency || null;
      if (data.contact) updateData.contact = data.contact;
      if (data.location !== undefined) updateData.location = data.location || null;
      if (data.featured !== undefined) updateData.featured = data.featured === 'true' || data.featured === true;
      if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt as string) : null;
      await prisma.job.update({ where: { id }, data: updateData });
    } else if (type === 'resource') {
      const updateData: Record<string, any> = {};
      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.type) updateData.type = data.type;
      if (data.category) updateData.category = data.category;
      if (data.url) updateData.url = data.url;
      if (data.tags) updateData.tags = parseArray(data.tags);
      if (data.addedBy) updateData.addedBy = data.addedBy;
      if (data.featured !== undefined) updateData.featured = data.featured === 'true' || data.featured === true;
      await prisma.resource.update({ where: { id }, data: updateData });
    } else if (type === 'project') {
      const updateData: Record<string, any> = {};
      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.category) updateData.category = data.category;
      if (data.technologies) updateData.technologies = parseArray(data.technologies);
      if (data.authorName) updateData.authorName = data.authorName;
      if (data.authorGithub !== undefined) updateData.authorGithub = data.authorGithub || null;
      if (data.repo !== undefined) updateData.repo = data.repo || null;
      if (data.demo !== undefined) updateData.demo = data.demo || null;
      if (data.projectStatus) updateData.projectStatus = data.projectStatus;
      if (data.featured !== undefined) updateData.featured = data.featured === 'true' || data.featured === true;
      await prisma.project.update({ where: { id }, data: updateData });
    } else if (type === 'event') {
      const updateData: Record<string, any> = {};
      if (data.title) updateData.title = data.title;
      if (data.description) updateData.description = data.description;
      if (data.eventType) updateData.eventType = data.eventType;
      if (data.category) updateData.category = data.category;
      if (data.startDate) updateData.startDate = new Date(data.startDate as string);
      if (data.endDate) updateData.endDate = data.endDate ? new Date(data.endDate as string) : null;
      if (data.startTime !== undefined) updateData.startTime = data.startTime || null;
      if (data.location !== undefined) updateData.location = data.location || null;
      if (data.url !== undefined) updateData.url = data.url || null;
      if (data.contactInfo !== undefined) updateData.contactInfo = data.contactInfo || null;
      if (data.maxParticipants !== undefined) updateData.maxParticipants = parseNum(data.maxParticipants);
      if (data.featured !== undefined) updateData.featured = data.featured === 'true' || data.featured === true;
      await prisma.event.update({ where: { id }, data: updateData });
    } else if (type === 'featured') {
      const updateData: Record<string, any> = {};
      if (data.name) updateData.name = data.name;
      if (data.role) updateData.role = data.role;
      if (data.bio) updateData.bio = data.bio;
      if (data.tags) updateData.tags = parseArray(data.tags);
      if (data.availability) updateData.availability = data.availability;
      if (data.topSkill) updateData.topSkill = data.topSkill;
      if (data.isActive !== undefined) updateData.isActive = data.isActive === 'true' || data.isActive === true;
      await prisma.featuredCandidate.update({ where: { id }, data: updateData });
    } else {
      return new Response(JSON.stringify({ error: 'invalid_type' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('[content update]', err);
    return new Response(JSON.stringify({ error: 'update_failed' }), { status: 500 });
  }
};
