-- ============================================================================
-- Nexo Digital — Reset completo de la base de datos
-- ----------------------------------------------------------------------------
-- 1. Elimina todo lo creado por las migrations (0001 + 0002)
-- 2. Re-ejecuta ambas migrations desde cero
--
-- Uso: pegar en Supabase SQL Editor → Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop RLS policies
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_read_public"          on public.profiles;
drop policy if exists "profiles_insert_self"           on public.profiles;
drop policy if exists "profiles_update_self"           on public.profiles;
drop policy if exists "profiles_update_moderator"      on public.profiles;
drop policy if exists "profiles_delete_admin"          on public.profiles;

drop policy if exists "jobs_read_public"               on public.jobs;
drop policy if exists "jobs_read_author"               on public.jobs;
drop policy if exists "jobs_read_mod"                  on public.jobs;
drop policy if exists "jobs_insert_author"             on public.jobs;
drop policy if exists "jobs_delete_author_pending"     on public.jobs;
drop policy if exists "jobs_update_mod"                on public.jobs;
drop policy if exists "jobs_delete_admin"              on public.jobs;

drop policy if exists "resources_read_public"          on public.resources;
drop policy if exists "resources_read_author"          on public.resources;
drop policy if exists "resources_read_mod"             on public.resources;
drop policy if exists "resources_insert_author"        on public.resources;
drop policy if exists "resources_delete_author_pending" on public.resources;
drop policy if exists "resources_update_mod"           on public.resources;
drop policy if exists "resources_delete_admin"         on public.resources;

drop policy if exists "projects_read_public"           on public.projects;
drop policy if exists "projects_read_author"           on public.projects;
drop policy if exists "projects_read_mod"              on public.projects;
drop policy if exists "projects_insert_author"         on public.projects;
drop policy if exists "projects_delete_author_pending" on public.projects;
drop policy if exists "projects_update_mod"            on public.projects;
drop policy if exists "projects_delete_admin"          on public.projects;

drop policy if exists "moderation_log_read_mod"        on public.moderation_log;
drop policy if exists "moderation_log_read_author"     on public.moderation_log;
drop policy if exists "moderation_log_insert_mod"      on public.moderation_log;

-- ---------------------------------------------------------------------------
-- 2. Drop triggers (on auth.users AND public tables)
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created             on auth.users;
drop trigger if exists profiles_set_updated_at          on public.profiles;
drop trigger if exists jobs_set_updated_at              on public.jobs;
drop trigger if exists resources_set_updated_at         on public.resources;
drop trigger if exists projects_set_updated_at          on public.projects;
drop trigger if exists jobs_set_author                  on public.jobs;
drop trigger if exists resources_set_author             on public.resources;
drop trigger if exists projects_set_author              on public.projects;

-- ---------------------------------------------------------------------------
-- 3. Drop functions
-- ---------------------------------------------------------------------------

drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();
drop function if exists public.current_role();
drop function if exists public.is_moderator_or_admin();
drop function if exists public.is_admin();
drop function if exists public.get_email_by_username(text);
drop function if exists public.set_author_id_on_insert();

-- ---------------------------------------------------------------------------
-- 4. Drop tables
-- ---------------------------------------------------------------------------

drop table if exists public.moderation_log;
drop table if exists public.projects;
drop table if exists public.resources;
drop table if exists public.jobs;
drop table if exists public.profiles;
drop table if exists public.reserved_usernames;

-- ---------------------------------------------------------------------------
-- 5. Drop types (enums)
-- ---------------------------------------------------------------------------

drop type if exists public.user_role;
drop type if exists public.discipline;
drop type if exists public.moderation_status;
drop type if exists public.job_modality;
drop type if exists public.job_category;
drop type if exists public.resource_type;
drop type if exists public.resource_category;
drop type if exists public.project_status_kind;
drop type if exists public.project_category;

-- ============================================================================
-- A continuación, las migrations 0001 + 0002 completas
-- ============================================================================

-- 0001_user_system.sql

create type public.user_role as enum ('user', 'moderator', 'admin');

create type public.discipline as enum (
  'Desarrollo',
  'Diseño y 3D',
  'Edición y video',
  'Audio y Producción',
  'IA y herramientas',
  'Domótica / IoT / Hardware',
  'Otra'
);

create table public.reserved_usernames (
  username text primary key
);

insert into public.reserved_usernames (username) values
  ('home'), ('index'), ('proyectos'), ('recursos'), ('empleos'),
  ('login'), ('registro'), ('recuperar'), ('logout'), ('signin'), ('signup'),
  ('auth'), ('callback'), ('confirm'), ('error'),
  ('api'), ('admin'), ('administrator'), ('moderator'), ('mod'),
  ('u'), ('user'), ('users'), ('perfil'), ('profile'), ('account'), ('settings'),
  ('dashboard'), ('panel'),
  ('static'), ('public'), ('assets'), ('_astro'),
  ('favicon.ico'), ('robots.txt'), ('sitemap.xml'),
  ('nexo'), ('nexodigital'), ('nexo-digital'), ('admin-nexo'),
  ('soporte'), ('support'), ('help'), ('ayuda'),
  ('contacto'), ('contact'), ('about'), ('acerca'),
  ('staff'), ('team'), ('equipo'), ('official'), ('oficial'),
  ('root'), ('superuser'), ('sysadmin'), ('webmaster'),
  ('me'), ('you'), ('all'), ('everyone'), ('anonymous'), ('anon');

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null check (char_length(username) between 3 and 30)
                                            and (username ~ '^[a-zA-Z0-9_]+$'),
  display_name text,
  avatar_url   text,
  bio          text check (bio is null or char_length(bio) <= 500),
  discipline   public.discipline,
  skills       text[] default '{}'::text[] check (cardinality(skills) <= 20),
  website      text,
  github       text,
  linkedin     text,
  twitter      text,
  role         public.user_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_username_not_reserved
    check (lower(username) not in (select username from public.reserved_usernames))
);

create index profiles_username_idx on public.profiles (username);
create index profiles_role_idx     on public.profiles (role);
create index profiles_discipline_idx on public.profiles (discipline);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_username text;
  base_username text;
  final_username text;
  counter int := 0;
begin
  meta_username := new.raw_user_meta_data->>'username';
  if meta_username is not null
     and char_length(meta_username) between 3 and 30
     and meta_username ~ '^[a-zA-Z0-9_]+$'
     and lower(meta_username) not in (select username from public.reserved_usernames)
  then
    base_username := meta_username;
  else
    base_username := split_part(coalesce(new.email, 'user'), '@', 1);
    base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g');
    base_username := substr(base_username, 1, 24);
    if char_length(base_username) < 3 then
      base_username := 'user';
    end if;
  end if;

  final_username := base_username;
  while counter < 50 and (
    exists (select 1 from public.profiles where username = final_username)
    or exists (select 1 from public.reserved_usernames where username = lower(final_username))
  ) loop
    counter := counter + 1;
    final_username := substr(base_username, 1, 24) || counter::text;
  end loop;

  if counter >= 50 then
    final_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 22);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'full_name', final_username));

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('moderator', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.get_email_by_username(target_username text)
returns text
language sql
stable
security definer
set search_path = auth, public
as $$
  select email from auth.users
  where id = (select id from public.profiles where username = target_username);
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

alter table public.profiles enable row level security;

create policy "profiles_read_public"
  on public.profiles
  for select
  using (true);

create policy "profiles_insert_self"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_update_moderator"
  on public.profiles
  for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

create policy "profiles_delete_admin"
  on public.profiles
  for delete
  using (public.is_admin());

-- 0002_portals.sql

create type public.moderation_status as enum (
  'pending', 'approved', 'rejected', 'removed'
);

create type public.job_modality as enum (
  'remoto', 'hibrido', 'presencial'
);

create type public.job_category as enum (
  'desarrollo', 'diseño', 'ia', 'edicion', 'audio', 'marketing', 'rrhh'
);

create type public.resource_type as enum (
  'herramienta', 'tutorial', 'recurso', 'template', 'documentacion'
);

create type public.resource_category as enum (
  'desarrollo', 'diseño', 'ia', 'marketing', 'audio', 'edicion',
  'negocios', 'aprendizaje', 'iot'
);

create type public.project_status_kind as enum (
  'activo', 'en_progreso', 'archivado'
);

create type public.project_category as enum (
  'desarrollo', 'diseño', 'ia', 'iot', 'edicion', 'audio', 'gamedev'
);

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.profiles(id) on delete set null,
  is_system       boolean not null default false,
  title           text not null check (char_length(title) between 4 and 120),
  company         text not null check (char_length(company) between 1 and 80),
  description     text not null check (char_length(description) between 20 and 2000),
  requirements    text[] not null default '{}'::text[]
                     check (cardinality(requirements) <= 20),
  modality        public.job_modality not null,
  category        public.job_category not null,
  salary_min      integer check (salary_min is null or salary_min >= 0),
  salary_max      integer check (salary_max is null or salary_max >= 0),
  currency        text check (currency is null or char_length(currency) between 2 and 8),
  contact         text not null check (char_length(contact) between 4 and 200),
  location        text check (location is null or char_length(location) <= 120),
  status          public.moderation_status not null default 'pending',
  moderator_id    uuid references public.profiles(id) on delete set null,
  moderated_at    timestamptz,
  moderation_notes text check (moderation_notes is null or char_length(moderation_notes) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
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

alter table public.jobs
  add constraint jobs_author_system_consistent
  check (
    (is_system = true  and author_id is null) or
    (is_system = false and author_id is not null)
  );

create table public.resources (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.profiles(id) on delete set null,
  is_system       boolean not null default false,
  title           text not null check (char_length(title) between 4 and 120),
  description     text not null check (char_length(description) between 20 and 2000),
  type            public.resource_type not null,
  category        public.resource_category not null,
  url             text not null check (char_length(url) between 8 and 500),
  tags            text[] not null default '{}'::text[] check (cardinality(tags) <= 20),
  added_by        text not null check (char_length(added_by) between 1 and 80),
  status          public.moderation_status not null default 'pending',
  moderator_id    uuid references public.profiles(id) on delete set null,
  moderated_at    timestamptz,
  moderation_notes text check (moderation_notes is null or char_length(moderation_notes) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
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

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid references public.profiles(id) on delete set null,
  is_system       boolean not null default false,
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
  status          public.moderation_status not null default 'pending',
  moderator_id    uuid references public.profiles(id) on delete set null,
  moderated_at    timestamptz,
  moderation_notes text check (moderation_notes is null or char_length(moderation_notes) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
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

create policy "moderation_log_insert_mod"
  on public.moderation_log
  for insert
  with check (public.is_moderator_or_admin());

alter table public.jobs      enable row level security;
alter table public.resources enable row level security;
alter table public.projects  enable row level security;

create policy "jobs_read_public"
  on public.jobs for select using (status = 'approved');

create policy "jobs_read_author"
  on public.jobs for select using (author_id = auth.uid());

create policy "jobs_read_mod"
  on public.jobs for select using (public.is_moderator_or_admin());

create policy "jobs_insert_author"
  on public.jobs for insert
  with check (
    auth.uid() = author_id
    and is_system = false
    and status = 'pending'
  );

create policy "jobs_delete_author_pending"
  on public.jobs for delete
  using (author_id = auth.uid() and status = 'pending');

create policy "jobs_update_mod"
  on public.jobs for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

create policy "jobs_delete_admin"
  on public.jobs for delete using (public.is_admin());

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

-- Seed: migrate existing JSON content as system rows

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
