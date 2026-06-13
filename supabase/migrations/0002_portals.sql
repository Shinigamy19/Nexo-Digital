-- ============================================================================
-- Nexo Digital — Portales de Empleos / Recursos / Proyectos
-- ----------------------------------------------------------------------------
-- Agrega las tres tablas que reemplazan al sistema de GitHub Issues para
-- los envíos de contenido. Los moderadores pueden aprobarlos o rechazarlos
-- desde `/moderacion`.
--
-- Cada tabla tiene el mismo conjunto de columnas de moderación:
--   status         : pending | approved | rejected | removed
--   author_id      : NULL para contenido "del sistema" (seed inicial)
--   is_system      : TRUE para contenido sembrado, FALSE para envíos
--   moderator_id   : quién aprobó/rechazó (última acción)
--   moderated_at   : cuándo se moderó
--   moderation_notes : nota opcional que ve el autor
--
-- Seguridad:
--   * RLS: lectura pública de `approved`, autor ve los suyos propios
--     (cualquier status), moderador+ ve todos.
--   * INSERT: solo usuarios autenticados, status se fuerza a 'pending',
--     author_id se fuerza a auth.uid() en trigger.
--   * UPDATE: solo moderador+ puede cambiar `status`. Los autores no
--     pueden editar sus envíos (simplifica el MVP; podrían hacerlo
--     reenviando).
--   * moderation_log audita cada acción.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

create type public.moderation_status as enum (
  'pending',
  'approved',
  'rejected',
  'removed'
);

create type public.job_modality as enum (
  'remoto',
  'hibrido',
  'presencial'
);

create type public.job_category as enum (
  'desarrollo',
  'diseño',
  'ia',
  'edicion',
  'audio',
  'marketing',
  'rrhh'
);

create type public.resource_type as enum (
  'herramienta',
  'tutorial',
  'recurso',
  'template',
  'documentacion'
);

create type public.resource_category as enum (
  'desarrollo',
  'diseño',
  'ia',
  'marketing',
  'audio',
  'edicion',
  'negocios',
  'aprendizaje',
  'iot'
);

create type public.project_status_kind as enum (
  'activo',
  'en_progreso',
  'archivado'
);

create type public.project_category as enum (
  'desarrollo',
  'diseño',
  'ia',
  'iot',
  'edicion',
  'audio',
  'gamedev'
);

-- ---------------------------------------------------------------------------
-- 2. Shared moderation columns helper
-- ---------------------------------------------------------------------------
-- No hay forma DRY de compartir columnas en PG puro, así que cada tabla
-- repite el patrón. El trigger set_updated_at() ya existe en 0001.

-- ---------------------------------------------------------------------------
-- 3. jobs
-- ---------------------------------------------------------------------------

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  -- author_id is NULL for system-seeded content; otherwise the submitter.
  author_id       uuid references public.profiles(id) on delete set null,
  is_system       boolean not null default false,
  -- Content
  title           text not null check (char_length(title) between 4 and 120),
  company         text not null check (char_length(company) between 1 and 80),
  description     text not null check (char_length(description) between 20 and 2000),
  requirements    text[] not null default '{}'::text[] check (cardinality(requirements) <= 20 and array_length(requirements, 1) is not null or requirements = '{}'::text[]),
  modality        public.job_modality not null,
  category        public.job_category not null,
  salary_min      integer check (salary_min is null or salary_min >= 0),
  salary_max      integer check (salary_max is null or salary_max >= 0),
  currency        text check (currency is null or char_length(currency) between 2 and 8),
  contact         text not null check (char_length(contact) between 4 and 200),
  location        text check (location is null or char_length(location) <= 120),
  -- Moderation
  status          public.moderation_status not null default 'pending',
  moderator_id    uuid references public.profiles(id) on delete set null,
  moderated_at    timestamptz,
  moderation_notes text check (moderation_notes is null or char_length(moderation_notes) <= 500),
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Constraints
  constraint jobs_salary_range_valid
    check (salary_min is null or salary_max is null or salary_min <= salary_max)
);

create index jobs_status_idx       on public.jobs (status);
create index jobs_author_idx       on public.jobs (author_id);
create index jobs_created_at_idx   on public.jobs (created_at desc);
create index jobs_category_idx     on public.jobs (category, status);
create index jobs_modality_idx     on public.jobs (modality, status);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Enforce: when author_id is set, is_system must be false. When is_system
-- is true, author_id must be null. This prevents spoofing "official" content.
alter table public.jobs
  add constraint jobs_author_system_consistent
  check (
    (is_system = true  and author_id is null) or
    (is_system = false and author_id is not null)
  );

-- ---------------------------------------------------------------------------
-- 4. resources
-- ---------------------------------------------------------------------------

create table public.resources (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.profiles(id) on delete set null,
  is_system       boolean not null default false,
  -- Content
  title           text not null check (char_length(title) between 4 and 120),
  description     text not null check (char_length(description) between 20 and 2000),
  type            public.resource_type not null,
  category        public.resource_category not null,
  url             text not null check (char_length(url) between 8 and 500),
  tags            text[] not null default '{}'::text[] check (cardinality(tags) <= 20),
  added_by        text not null check (char_length(added_by) between 1 and 80),
  -- Moderation
  status          public.moderation_status not null default 'pending',
  moderator_id    uuid references public.profiles(id) on delete set null,
  moderated_at    timestamptz,
  moderation_notes text check (moderation_notes is null or char_length(moderation_notes) <= 500),
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Constraints
  constraint resources_author_system_consistent
  check (
    (is_system = true  and author_id is null) or
    (is_system = false and author_id is not null)
  )
);

create index resources_status_idx     on public.resources (status);
create index resources_author_idx     on public.resources (author_id);
create index resources_created_at_idx on public.resources (created_at desc);
create index resources_type_idx       on public.resources (type, status);
create index resources_category_idx   on public.resources (category, status);

create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.profiles(id) on delete set null,
  is_system       boolean not null default false,
  -- Content
  title           text not null check (char_length(title) between 4 and 120),
  description     text not null check (char_length(description) between 20 and 2000),
  category        public.project_category not null,
  technologies    text[] not null default '{}'::text[] check (cardinality(technologies) <= 20),
  author          text not null check (char_length(author) between 1 and 80),
  author_github   text check (author_github is null or char_length(author_github) between 1 and 80),
  repo            text check (repo is null or char_length(repo) between 8 and 500),
  demo            text check (demo is null or char_length(demo) between 8 and 500),
  project_status  public.project_status_kind not null default 'activo',
  featured        boolean not null default false,
  -- Moderation
  status          public.moderation_status not null default 'pending',
  moderator_id    uuid references public.profiles(id) on delete set null,
  moderated_at    timestamptz,
  moderation_notes text check (moderation_notes is null or char_length(moderation_notes) <= 500),
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Constraints
  constraint projects_author_system_consistent
  check (
    (is_system = true  and author_id is null) or
    (is_system = false and author_id is not null)
  )
);

create index projects_status_idx     on public.projects (status);
create index projects_author_idx     on public.projects (author_id);
create index projects_created_at_idx on public.projects (created_at desc);
create index projects_category_idx   on public.projects (category, status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Triggers: enforce author_id on INSERT
-- ---------------------------------------------------------------------------
-- Even though the API endpoint sets author_id from the session, the DB
-- enforces it as a defense in depth. This way, if anyone bypasses the API
-- and inserts via the service role, the author_id is still tied to the
-- caller's auth.uid(). Service role (BYPASSRLS) can still override.

create or replace function public.set_author_id_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.is_system = false and new.author_id is null and auth.uid() is not null then
    new.author_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger jobs_set_author
  before insert on public.jobs
  for each row execute function public.set_author_id_on_insert();

create trigger resources_set_author
  before insert on public.resources
  for each row execute function public.set_author_id_on_insert();

create trigger projects_set_author
  before insert on public.projects
  for each row execute function public.set_author_id_on_insert();

-- ---------------------------------------------------------------------------
-- 7. Moderation log
-- ---------------------------------------------------------------------------

create table public.moderation_log (
  id              bigserial primary key,
  moderator_id    uuid not null references public.profiles(id) on delete cascade,
  target_type     text not null check (target_type in ('job', 'resource', 'project')),
  target_id       uuid not null,
  action          text not null check (action in ('approve', 'reject', 'remove', 'reopen')),
  notes           text check (notes is null or char_length(notes) <= 500),
  created_at      timestamptz not null default now()
);

create index moderation_log_target_idx on public.moderation_log (target_type, target_id);
create index moderation_log_moderator_idx on public.moderation_log (moderator_id, created_at desc);

alter table public.moderation_log enable row level security;

-- Moderators can read the log; users can read entries that target their
-- own content. Public read is denied.
create policy "moderation_log_read_mod"
  on public.moderation_log
  for select
  using (public.is_moderator_or_admin());

create policy "moderation_log_read_author"
  on public.moderation_log
  for select
  using (
    target_type = 'job'     and exists (select 1 from public.jobs     j where j.id = target_id and j.author_id = auth.uid())
    or target_type = 'resource' and exists (select 1 from public.resources r where r.id = target_id and r.author_id = auth.uid())
    or target_type = 'project'  and exists (select 1 from public.projects  p where p.id = target_id and p.author_id = auth.uid())
  );

-- Only moderators can insert (the API endpoint uses the service role,
-- but even a direct call from a mod is safe).
create policy "moderation_log_insert_mod"
  on public.moderation_log
  for insert
  with check (public.is_moderator_or_admin());

-- ---------------------------------------------------------------------------
-- 8. Row Level Security: jobs / resources / projects
-- ---------------------------------------------------------------------------
-- Read rules (same shape for all three tables):
--   * Anyone (incl. anon) can read rows where status = 'approved'
--   * The author can read their own rows in any status
--   * Moderators+ can read every row

alter table public.jobs      enable row level security;
alter table public.resources enable row level security;
alter table public.projects  enable row level security;

-- ----- jobs -----
create policy "jobs_read_public"
  on public.jobs for select using (status = 'approved');

create policy "jobs_read_author"
  on public.jobs for select using (author_id = auth.uid());

create policy "jobs_read_mod"
  on public.jobs for select using (public.is_moderator_or_admin());

-- Authors can only insert their own pending rows. The trigger above
-- forces author_id; the WITH CHECK prevents lying about is_system.
create policy "jobs_insert_author"
  on public.jobs for insert
  with check (
    auth.uid() = author_id
    and is_system = false
    and status = 'pending'
  );

-- Authors can DELETE only their own pending rows (allows them to
-- withdraw a submission before it's reviewed). System content is
-- not deletable by anyone except admins (via service role).
create policy "jobs_delete_author_pending"
  on public.jobs for delete
  using (author_id = auth.uid() and status = 'pending');

-- Mods can update (approve/reject/edit). Authors cannot update at all
-- in this MVP; they can re-submit if they want to change something.
create policy "jobs_update_mod"
  on public.jobs for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

-- Admins can hard-delete (for spam/abuse cleanup).
create policy "jobs_delete_admin"
  on public.jobs for delete using (public.is_admin());

-- ----- resources -----
create policy "resources_read_public"
  on public.resources for select using (status = 'approved');

create policy "resources_read_author"
  on public.resources for select using (author_id = auth.uid());

create policy "resources_read_mod"
  on public.resources for select using (public.is_moderator_or_admin());

create policy "resources_insert_author"
  on public.resources for insert
  with check (
    auth.uid() = author_id
    and is_system = false
    and status = 'pending'
  );

create policy "resources_delete_author_pending"
  on public.resources for delete
  using (author_id = auth.uid() and status = 'pending');

create policy "resources_update_mod"
  on public.resources for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

create policy "resources_delete_admin"
  on public.resources for delete using (public.is_admin());

-- ----- projects -----
create policy "projects_read_public"
  on public.projects for select using (status = 'approved');

create policy "projects_read_author"
  on public.projects for select using (author_id = auth.uid());

create policy "projects_read_mod"
  on public.projects for select using (public.is_moderator_or_admin());

create policy "projects_insert_author"
  on public.projects for insert
  with check (
    auth.uid() = author_id
    and is_system = false
    and status = 'pending'
  );

create policy "projects_delete_author_pending"
  on public.projects for delete
  using (author_id = auth.uid() and status = 'pending');

create policy "projects_update_mod"
  on public.projects for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

create policy "projects_delete_admin"
  on public.projects for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. Seed: migrate existing JSON content as system rows
-- ---------------------------------------------------------------------------
-- Run this section ONLY on a fresh DB. If you run 0001 + 0002 from
-- scratch, you'll get the same content that's currently in
-- src/data/{jobs,resources,projects}.json, all marked is_system=true
-- and status='approved' so they show up in the public listing.

insert into public.jobs
  (is_system, title, company, description, requirements, modality, category,
   salary_min, salary_max, currency, contact, location, status, moderated_at)
values
  (true, 'Senior Frontend Engineer', 'TechBA Studio',
   'Buscamos un/a Senior Frontend con 5+ años de experiencia en React/Next.js, dominio de TypeScript y buenas prácticas de accesibilidad y performance. Trabajo en equipo multicultural, en español.',
   array['React','Next.js','TypeScript','Accesibilidad','Testing'], 'remoto', 'desarrollo',
   2500, 3500, 'USD', 'jobs@techba.example', 'Argentina (remoto)', 'approved', now()),
  (true, 'UX/UI Designer híbrido CABA', 'Agencia Pixel',
   'Diseño de producto para clientes del sector fintech y edtech. Investigación con usuarios, prototipado en Figma y trabajo codo a codo con devs. Jornada híbrida 3 días oficina.',
   array['Figma','Design System','Investigación','Mobile'], 'hibrido', 'diseño',
   800000, 1200000, 'ARS', 'rrhh@agenciapixel.example', 'CABA', 'approved', now()),
  (true, 'Backend Python + ML', 'DataNexo',
   'Desarrollo de microservicios en FastAPI, modelos de ML en producción (sklearn, PyTorch), PostgreSQL y Redis. 100% remoto LATAM, horario flexible.',
   array['Python','FastAPI','PostgreSQL','PyTorch','Docker'], 'remoto', 'ia',
   3000, 4500, 'USD', 'talent@datanexo.example', 'LATAM remoto', 'approved', now()),
  (true, 'Editor/a de video para contenido', 'Creadores ARG',
   'Edición de videos cortos (Reels/Shorts) y largos (YouTube) para creadores de contenido. Motion graphics básico, color grading. Remoto, pago por entrega + retainer.',
   array['Premiere','After Effects','Color','Motion'], 'remoto', 'edicion',
   600000, 900000, 'ARS', 'hola@creadoresarg.example', 'Argentina remoto', 'approved', now()),
  (true, 'Arquitecto/a de Software', 'NeoTech Solutions',
   'Liderazgo técnico de un equipo de 6 devs, diseño de arquitectura en AWS, mentoría y code review. Presencial en oficinas de Palermo, jornada completa.',
   array['AWS','Microservicios','Liderazgo','TypeScript','PostgreSQL'], 'presencial', 'desarrollo',
   4000, 6000, 'USD', 'arquitectura@neotech.example', 'CABA Palermo', 'approved', now());

insert into public.resources
  (is_system, title, description, type, category, url, tags, added_by, status, moderated_at)
values
  (true, 'Astro — Framework web todo-en-uno',
   'Documentación oficial de Astro. Excelente para sitios con mucho contenido estático y puntos de interacción aislados.',
   'documentacion', 'desarrollo', 'https://docs.astro.build',
   array['astro','ssg','ssr','typescript'], 'Equipo Nexo Digital', 'approved', now()),
  (true, 'Figma — Diseño de interfaces',
   'Herramienta de diseño colaborativa. Plan gratuito generoso, plugins para design systems y prototipado rápido.',
   'herramienta', 'diseño', 'https://figma.com',
   array['figma','ui','colaboracion','design-system'], 'Equipo Nexo Digital', 'approved', now()),
  (true, 'Supabase — Backend as a Service',
   'Postgres gestionado con auth, storage y realtime incluidos. Alternativa open source a Firebase.',
   'herramienta', 'desarrollo', 'https://supabase.com',
   array['supabase','postgres','auth','baas'], 'Equipo Nexo Digital', 'approved', now()),
  (true, 'Tutorial: SSR con Astro y Supabase',
   'Cómo armar un sitio híbrido (estático + SSR) con autenticación de Supabase paso a paso.',
   'tutorial', 'desarrollo', 'https://docs.astro.build/en/guides/integrations-guide/supabase/',
   array['astro','supabase','ssr','auth'], 'Equipo Nexo Digital', 'approved', now()),
  (true, 'Plantilla de design system en Figma',
   'Componentes, tokens y patrones listos para arrancar un producto. Compartida por la comunidad.',
   'template', 'diseño', 'https://figma.com/community/file/...',
   array['figma','design-system','tokens','componentes'], 'Equipo Nexo Digital', 'approved', now()),
  (true, 'Hugging Face — Modelos de IA',
   'Hub de modelos open source. Probá LLMs, modelos de visión y audio directamente en el browser.',
   'herramienta', 'ia', 'https://huggingface.co',
   array['ia','llm','open-source','modelos'], 'Equipo Nexo Digital', 'approved', now()),
  (true, 'DaVinci Resolve — Edición de video gratuita',
   'Editor de video profesional con versión gratuita muy completa. Color grading y audio integrados.',
   'herramienta', 'edicion', 'https://blackmagicdesign.com/products/davinciresolve',
   array['video','edicion','color','audio'], 'Equipo Nexo Digital', 'approved', now());

insert into public.projects
  (is_system, title, description, category, technologies, author, author_github,
   repo, demo, project_status, featured, status, moderated_at)
values
  (true, 'Nexo Digital (este sitio)',
   'Comunidad open source para creadores del mundo digital. Astro + Supabase.',
   'desarrollo', array['Astro','Supabase','TypeScript','CSS Modules'],
   'Equipo Nexo Digital', 'NexoDigital-Lab',
   'https://github.com/NexoDigital-Lab/Nexo-Digital', 'https://nexo-digital.example',
   'activo', true, 'approved', now()),
  (true, 'Plantillas de proyectos Astro',
   'Colección de starters de Astro configurados con Supabase, Tailwind y casos de uso comunes.',
   'desarrollo', array['Astro','Supabase','Tailwind'],
   'Equipo Nexo Digital', 'NexoDigital-Lab',
   'https://github.com/NexoDigital-Lab/astro-starters', null,
   'en_progreso', false, 'approved', now()),
  (true, 'Bot de moderación para Discord',
   'Bot open source para moderar canales de Discord de comunidades tech. Filtros, logs, comandos.',
   'desarrollo', array['Node.js','Discord.js','PostgreSQL'],
   'Marcos R.', 'marcos-r',
   'https://github.com/marcos-r/discord-mod-bot', null,
   'activo', false, 'approved', now()),
  (true, 'Librería de componentes Vue 3',
   'Set de componentes UI accesibles y tematizables para Vue 3. TypeScript, tests, docs en VitePress.',
   'desarrollo', array['Vue 3','TypeScript','Vite','VitePress'],
   'Sofía L.', 'sofia-l',
   'https://github.com/sofia-l/vue3-ui', 'https://sofia-l.github.io/vue3-ui',
   'activo', true, 'approved', now()),
  (true, 'Mapa interactivo de makers LATAM',
   'Visualización geográfica de la comunidad maker/hardware de Latinoamérica. Datos abiertos.',
   'iot', array['Leaflet','OpenStreetMap','Astro','D3'],
   'Cristian P.', 'cristian-p',
   'https://github.com/cristian-p/makers-latam', 'https://cristian-p.github.io/makers-latam',
   'en_progreso', false, 'approved', now());

-- ---------------------------------------------------------------------------
-- 10. Promote the first moderator (run manually after your first signup)
-- ---------------------------------------------------------------------------
-- Replace 'you@example.com' with your email and run:
--
--   update public.profiles
--   set role = 'moderator'
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- Promote additional mods/admins from the SQL editor or from
-- /moderacion (TODO: in-app user management, not in MVP).
