import { createRequire } from 'node:module';
import type {
  JobCategory as AppJobCategory,
  JobModality as AppJobModality,
  ResourceCategory as AppResourceCategory,
  ResourceType as AppResourceType,
  ProjectCategory as AppProjectCategory,
  EventCategoryKind as AppEventCategory,
} from '../types/database';

// Vite's CJS→ESM interop corrupts `@prisma/client` into `.prisma/client/default`
// (an invalid ESM specifier). Using createRequire() gives us a native CJS
// require function that resolves @prisma/client entirely at runtime, bypassing
// Vite's module transform.
const _require = createRequire(import.meta.url);
const { PrismaClient } = _require('@prisma/client') as { PrismaClient: new () => any };

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType };

export const prisma: PrismaClientType = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ─── App → Prisma enum mapping ─────────────────────────────────────────
// App types use 'diseño' (with ñ); Prisma generated enums use 'diseno'.

const JOB_CATEGORY_MAP: Record<AppJobCategory, string> = {
  desarrollo: 'desarrollo',
  'diseño': 'diseno',
  ia: 'ia',
  edicion: 'edicion',
  audio: 'audio',
  marketing: 'marketing',
  rrhh: 'rrhh',
};

const JOB_MODALITY_MAP: Record<AppJobModality, string> = {
  remoto: 'remoto',
  hibrido: 'hibrido',
  presencial: 'presencial',
};

const RESOURCE_TYPE_MAP: Record<AppResourceType, string> = {
  herramienta: 'herramienta',
  tutorial: 'tutorial',
  recurso: 'recurso',
  template: 'template',
  documentacion: 'documentacion',
};

const RESOURCE_CATEGORY_MAP: Record<AppResourceCategory, string> = {
  desarrollo: 'desarrollo',
  'diseño': 'diseno',
  ia: 'ia',
  marketing: 'marketing',
  audio: 'audio',
  edicion: 'edicion',
  negocios: 'negocios',
  aprendizaje: 'aprendizaje',
  iot: 'iot',
};

const PROJECT_CATEGORY_MAP: Record<AppProjectCategory, string> = {
  desarrollo: 'desarrollo',
  'diseño': 'diseno',
  ia: 'ia',
  iot: 'iot',
  edicion: 'edicion',
  audio: 'audio',
  gamedev: 'gamedev',
};

export function toPrismaJobCategory(v: AppJobCategory): string {
  return JOB_CATEGORY_MAP[v] ?? v;
}

export function toPrismaJobModality(v: AppJobModality): string {
  return JOB_MODALITY_MAP[v] ?? v;
}

export function toPrismaResourceType(v: AppResourceType): string {
  return RESOURCE_TYPE_MAP[v] ?? v;
}

export function toPrismaResourceCategory(v: AppResourceCategory): string {
  return RESOURCE_CATEGORY_MAP[v] ?? v;
}

export function toPrismaProjectCategory(v: AppProjectCategory): string {
  return PROJECT_CATEGORY_MAP[v] ?? v;
}

const EVENT_CATEGORY_MAP: Record<AppEventCategory, string> = {
  conferencia: 'conferencia',
  workshop: 'workshop',
  networking: 'networking',
  hackathon: 'hackathon',
  curso: 'curso',
  encuentro: 'encuentro',
  otro: 'otro',
};

export function toPrismaEventCategory(v: AppEventCategory): string {
  return EVENT_CATEGORY_MAP[v] ?? v;
}
