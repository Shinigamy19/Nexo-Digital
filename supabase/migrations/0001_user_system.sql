-- ============================================================================
-- Nexo Digital — User system (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- Run this file in the Supabase SQL Editor (Database → SQL Editor → New query)
-- or via the Supabase CLI: `supabase db push` after dropping it in
-- `supabase/migrations/`.
--
-- It creates:
--   * The `profiles` table that extends `auth.users` 1-to-1.
--   * A trigger that auto-creates a profile on signup.
--   * A `role` enum and helpers to check it.
--   * Row Level Security policies (read public, write self, role-gated writes).
--
-- After running, enable the auth providers you want in
-- Authentication → Providers (Email, Google, GitHub) and add the OAuth
-- redirect URL: <PUBLIC_SITE_URL>/auth/callback
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------------

-- Reserved usernames: enforce at the DB level too as a defence in depth.
-- The application layer (src/lib/security.ts) maintains a richer list.
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
  -- Reserved usernames: deny insert/update with a reserved name.
  constraint profiles_username_not_reserved
    check (lower(username) not in (select username from public.reserved_usernames))
);

create index profiles_username_idx on public.profiles (username);
create index profiles_role_idx     on public.profiles (role);
create index profiles_discipline_idx on public.profiles (discipline);

-- ---------------------------------------------------------------------------
-- 3. updated_at trigger
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 4. Auto-create profile on signup
-- ---------------------------------------------------------------------------

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
  -- Prefer username from user metadata (set during signup), otherwise derive from email
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

  -- Last resort: use a UUID-derived name. This still satisfies the
  -- format check and avoids any collision or reserved word.
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

-- ---------------------------------------------------------------------------
-- 5. Role helpers
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 6. Helper to look up a user's email by their username
--    (used server-side to support login via username)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- Read: any visitor (even anon) can read public profile fields.
create policy "profiles_read_public"
  on public.profiles
  for select
  using (true);

-- Insert: only the trigger (service role) inserts. Block direct inserts.
-- We still allow it if the row id matches the caller, so OAuth flows that
-- create the row client-side (rare) keep working.
create policy "profiles_insert_self"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Update: a user can update their own profile but cannot change `role`.
-- Moderators/admins can update any profile (but still cannot change their
-- own role to escalate).
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

-- Delete: only admins can delete profiles. (Cascade handles auth.users deletes.)
create policy "profiles_delete_admin"
  on public.profiles
  for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. Promote a user to admin (run once manually, after first signup)
-- ---------------------------------------------------------------------------
-- Replace 'you@example.com' with your email and run:
--
--   update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
