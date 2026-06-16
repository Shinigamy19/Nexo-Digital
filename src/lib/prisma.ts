import { createRequire } from 'node:module';
import type {
  JobCategory as AppJobCategory,
  JobModality as AppJobModality,
  ResourceCategory as AppResourceCategory,
  ResourceType as AppResourceType,
  ProjectCategory as AppProjectCategory,
  ProjectType as AppProjectType,
  EventCategoryKind as AppEventCategory,
} from '../types/database';

const _require = createRequire(import.meta.url);
const { PrismaClient } = _require('@prisma/client') as { PrismaClient: new () => any };

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientInstance };

export const prisma: PrismaClientInstance = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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

const PROJECT_TYPE_MAP: Record<AppProjectType, string> = {
  desarrollo: 'desarrollo',
  audiovisual: 'audiovisual',
};

const EVENT_CATEGORY_MAP: Record<AppEventCategory, string> = {
  conferencia: 'conferencia',
  workshop: 'workshop',
  networking: 'networking',
  hackathon: 'hackathon',
  curso: 'curso',
  encuentro: 'encuentro',
  otro: 'otro',
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

export function toPrismaProjectType(v: AppProjectType): string {
  return PROJECT_TYPE_MAP[v] ?? v;
}

export function toPrismaEventCategory(v: AppEventCategory): string {
  return EVENT_CATEGORY_MAP[v] ?? v;
}
