/**
 * Display metadata for the three portals: human-readable labels,
 * emojis, colors. Kept in one place so the form, listing, and
 * moderation UI stay in sync.
 */
import type {
  JobCategory,
  JobModality,
  ProjectCategory,
  ProjectStatusKind,
  ResourceCategory,
  ResourceType,
  EventCategoryKind,
  EventTypeKind,
} from '../types/database';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  emoji: string;
}

// ---- Empleos ----

export const JOB_MODALITIES: readonly SelectOption<JobModality>[] = [
  { value: 'remoto',     label: 'Remoto',      emoji: '🌐' },
  { value: 'hibrido',    label: 'Híbrido',     emoji: '🔀' },
  { value: 'presencial', label: 'Presencial',  emoji: '🏢' },
];

export const JOB_CATEGORIES: readonly SelectOption<JobCategory>[] = [
  { value: 'desarrollo', label: 'Desarrollo', emoji: '💻' },
  { value: 'diseño',     label: 'Diseño',     emoji: '🎨' },
  { value: 'ia',         label: 'IA',         emoji: '🤖' },
  { value: 'edicion',    label: 'Edición',    emoji: '🎬' },
  { value: 'audio',      label: 'Audio',      emoji: '🎧' },
  { value: 'marketing',  label: 'Marketing',  emoji: '📢' },
  { value: 'rrhh',       label: 'RRHH',       emoji: '👥' },
];

export const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'MXN', 'CLP', 'COP', 'PEN'] as const;

// ---- Recursos ----

export const RESOURCE_TYPES: readonly SelectOption<ResourceType>[] = [
  { value: 'herramienta',    label: 'Herramienta',   emoji: '🛠️' },
  { value: 'tutorial',       label: 'Tutorial',      emoji: '📖' },
  { value: 'recurso',        label: 'Recurso',       emoji: '📦' },
  { value: 'template',       label: 'Template',      emoji: '📋' },
  { value: 'documentacion',  label: 'Documentación', emoji: '📚' },
];

export const RESOURCE_CATEGORIES: readonly SelectOption<ResourceCategory>[] = [
  { value: 'desarrollo', label: 'Desarrollo',  emoji: '💻' },
  { value: 'diseño',     label: 'Diseño',      emoji: '🎨' },
  { value: 'ia',         label: 'IA',          emoji: '🤖' },
  { value: 'marketing',  label: 'Marketing',   emoji: '📢' },
  { value: 'audio',      label: 'Audio',       emoji: '🎧' },
  { value: 'edicion',    label: 'Edición',     emoji: '🎬' },
  { value: 'negocios',   label: 'Negocios',    emoji: '💼' },
  { value: 'aprendizaje', label: 'Aprendizaje', emoji: '🎓' },
  { value: 'iot',        label: 'IoT',         emoji: '🔌' },
];

// ---- Proyectos ----

export const PROJECT_CATEGORIES: readonly SelectOption<ProjectCategory>[] = [
  { value: 'desarrollo', label: 'Desarrollo', emoji: '💻' },
  { value: 'diseño',     label: 'Diseño',     emoji: '🎨' },
  { value: 'ia',         label: 'IA',         emoji: '🤖' },
  { value: 'iot',        label: 'IoT',        emoji: '🔌' },
  { value: 'edicion',    label: 'Edición',    emoji: '🎬' },
  { value: 'audio',      label: 'Audio',      emoji: '🎧' },
  { value: 'gamedev',    label: 'Game Dev',   emoji: '🎮' },
];

export const PROJECT_STATUSES: readonly SelectOption<ProjectStatusKind>[] = [
  { value: 'activo',      label: 'Activo',      emoji: '🟢' },
  { value: 'en_progreso', label: 'En progreso', emoji: '🔵' },
  { value: 'archivado',   label: 'Archivado',   emoji: '⚫' },
];

// ---- Eventos ----

export const EVENT_TYPES: readonly SelectOption<EventTypeKind>[] = [
  { value: 'presencial', label: 'Presencial', emoji: '📍' },
  { value: 'en_linea',   label: 'En línea',   emoji: '💻' },
  { value: 'hibrido',    label: 'Híbrido',    emoji: '🔄' },
];

export const EVENT_CATEGORIES: readonly SelectOption<EventCategoryKind>[] = [
  { value: 'conferencia', label: 'Conferencia', emoji: '🎤' },
  { value: 'workshop',    label: 'Workshop',    emoji: '🔧' },
  { value: 'networking',  label: 'Networking',  emoji: '🤝' },
  { value: 'hackathon',   label: 'Hackathon',   emoji: '⚡' },
  { value: 'curso',       label: 'Curso',       emoji: '📚' },
  { value: 'encuentro',   label: 'Encuentro',   emoji: '🗣️' },
  { value: 'otro',        label: 'Otro',        emoji: '🎉' },
];

// ---- Human labels for moderation status (used in StatusBadge) ----
export const MODERATION_STATUS_LABELS = {
  pending:  { label: 'Pendiente',  emoji: '⏳' },
  approved: { label: 'Aprobado',   emoji: '✅' },
  rejected: { label: 'Rechazado',  emoji: '❌' },
  removed:  { label: 'Eliminado',  emoji: '🗑️' },
} as const;

export const MODERATION_ACTIONS = {
  approve: { label: 'Aprobar',   emoji: '✅' },
  reject:  { label: 'Rechazar',  emoji: '❌' },
  remove:  { label: 'Eliminar',  emoji: '🗑️' },
  reopen:  { label: 'Reabrir',   emoji: '↩️' },
} as const;
