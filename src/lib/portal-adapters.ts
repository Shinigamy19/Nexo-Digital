/**
 * Mappers from Supabase rows to the shape the existing card components
 * expect. Keeps the cards dumb (they don't need to know about the DB
 * schema) and centralises the conversion in one auditable place.
 */
import type { Job, Project, Resource, Event } from '../types/database';

export interface JobCardProps {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  modality: string;
  category: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  salaryType: string;
  contact: string;
  publishedAt: string;
  location: string;
}

export function toJobCardProps(j: Job): JobCardProps {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    description: j.description,
    requirements: j.requirements,
    modality: j.modality,
    category: j.category,
    salaryMin: j.salary_min ?? 0,
    salaryMax: j.salary_max ?? 0,
    currency: j.currency ?? 'USD',
    // The DB doesn't track salary period — the old JSON hard-coded
    // 'mensual' for everything. Keep parity until someone needs more.
    salaryType: 'mensual',
    contact: j.contact,
    publishedAt: j.moderated_at ?? j.created_at,
    location: j.location ?? '',
  };
}

export interface ResourceCardProps {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  url: string;
  tags: string[];
  addedBy: string;
}

export function toResourceCardProps(r: Resource): ResourceCardProps {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    category: r.category,
    url: r.url,
    tags: r.tags,
    addedBy: r.added_by,
  };
}

export interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  technologies: string[];
  author: string;
  authorGithub: string;
  repo: string;
  demo: string;
  status: string;
  featured: boolean;
}

export function toProjectCardProps(p: Project): ProjectCardProps {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    technologies: p.technologies,
    author: p.author,
    authorGithub: p.author_github ?? '',
    repo: p.repo ?? '',
    demo: p.demo ?? '',
    status: p.project_status,
    featured: p.featured,
  };
}

export interface EventCardProps {
  id: string;
  title: string;
  description: string;
  eventType: string;
  category: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  location: string | null;
  url: string | null;
  contactInfo: string | null;
  maxParticipants: number | null;
}

export function toEventCardProps(e: Event): EventCardProps {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    eventType: e.event_type,
    category: e.category,
    startDate: e.start_date,
    endDate: e.end_date,
    startTime: e.start_time,
    location: e.location,
    url: e.url,
    contactInfo: e.contact_info,
    maxParticipants: e.max_participants,
  };
}
