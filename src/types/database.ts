export type UserRole = 'user' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  discipline: string[];
  skills: string[] | null;
  website: string | null;
  github: string | null;
  behance: string | null;
  substack: string | null;
  itch: string | null;
  youtube: string | null;
  linkedin: string | null;
  twitter: string | null;
  tiktok: string | null;
  instagram: string | null;
  linktree: string | null;
  show_email: boolean;
  two_factor_enabled: boolean;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  discipline?: string[];
  skills?: string[] | null;
  website?: string | null;
  github?: string | null;
  behance?: string | null;
  substack?: string | null;
  itch?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  instagram?: string | null;
  linktree?: string | null;
  show_email?: boolean;
}

export type SessionUser = {
  id: string;
  email: string | null;
  profile: Profile | null;
};

// ---------------------------------------------------------------------------
// Portals: Empleos / Recursos / Proyectos
// ---------------------------------------------------------------------------

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'removed';
export type ModerationAction = 'approve' | 'reject' | 'remove' | 'reopen';

export type JobModality = 'remoto' | 'hibrido' | 'presencial';
export type JobCategory =
  | 'desarrollo'
  | 'diseño'
  | 'ia'
  | 'edicion'
  | 'audio'
  | 'marketing'
  | 'rrhh';

export type ResourceType =
  | 'herramienta'
  | 'tutorial'
  | 'recurso'
  | 'template'
  | 'documentacion';
export type ResourceCategory =
  | 'desarrollo'
  | 'diseño'
  | 'ia'
  | 'marketing'
  | 'audio'
  | 'edicion'
  | 'negocios'
  | 'aprendizaje'
  | 'iot';

export type ProjectStatusKind = 'activo' | 'en_progreso' | 'archivado';
export type ProjectCategory =
  | 'desarrollo'
  | 'diseño'
  | 'ia'
  | 'iot'
  | 'edicion'
  | 'audio'
  | 'gamedev';

// ---- events ----
export type EventTypeKind = 'presencial' | 'en_linea' | 'hibrido';
export type EventCategoryKind =
  | 'conferencia'
  | 'workshop'
  | 'networking'
  | 'hackathon'
  | 'curso'
  | 'encuentro'
  | 'otro';

export interface Event {
  id: string;
  author_id: string | null;
  is_system: boolean;
  title: string;
  description: string;
  event_type: EventTypeKind;
  category: EventCategoryKind;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  location: string | null;
  url: string | null;
  contact_info: string | null;
  max_participants: number | null;
  status: ModerationStatus;
  moderator_id: string | null;
  moderated_at: string | null;
  moderation_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventCreate {
  title: string;
  description: string;
  event_type: EventTypeKind;
  category: EventCategoryKind;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  location?: string | null;
  url?: string | null;
  contact_info?: string | null;
  max_participants?: number | null;
}

export type PortalType = 'job' | 'resource' | 'project' | 'event' | 'featured';

// ---- jobs ----
export interface Job {
  id: string;
  author_id: string | null;
  is_system: boolean;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  modality: JobModality;
  category: JobCategory;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  contact: string;
  location: string | null;
  status: ModerationStatus;
  moderator_id: string | null;
  moderated_at: string | null;
  moderation_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobCreate {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  modality: JobModality;
  category: JobCategory;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  contact: string;
  location?: string | null;
}

// ---- resources ----
export interface Resource {
  id: string;
  author_id: string | null;
  is_system: boolean;
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  url: string;
  tags: string[];
  added_by: string;
  status: ModerationStatus;
  moderator_id: string | null;
  moderated_at: string | null;
  moderation_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceCreate {
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  url: string;
  tags: string[];
  added_by: string;
}

// ---- projects ----
export interface Project {
  id: string;
  author_id: string | null;
  is_system: boolean;
  title: string;
  description: string;
  category: ProjectCategory;
  technologies: string[];
  author: string;
  author_github: string | null;
  repo: string | null;
  demo: string | null;
  project_status: ProjectStatusKind;
  featured: boolean;
  status: ModerationStatus;
  moderator_id: string | null;
  moderated_at: string | null;
  moderation_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  title: string;
  description: string;
  category: ProjectCategory;
  technologies: string[];
  author: string;
  author_github?: string | null;
  repo?: string | null;
  demo?: string | null;
  project_status?: ProjectStatusKind;
}

// ---- moderation log ----
export interface ModerationLogEntry {
  id: number;
  moderator_id: string;
  target_type: PortalType;
  target_id: string;
  action: ModerationAction;
  notes: string | null;
  created_at: string;
}
