-- ============================================================================
-- Nexo Digital — 0003: Link items (linktree de la comunidad)
-- ----------------------------------------------------------------------------
-- Linktree administrable desde el panel de admin. Tabla `link_items`.
-- ============================================================================

create table public.link_items (
  id          uuid primary key default gen_random_uuid(),
  label       text not null check (char_length(label) between 1 and 80),
  url         text not null default '' check (char_length(url) <= 500),
  emoji       text not null default '' check (char_length(emoji) <= 20),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index link_items_active_sort_idx on public.link_items (is_active, sort_order asc, created_at desc);

create trigger link_items_set_updated_at
  before update on public.link_items
  for each row execute function public.set_updated_at();

-- Seed: mismos datos que el fallback estático en src/data/links.json
insert into public.link_items (label, url, emoji, sort_order, is_active) values
  ('WhatsApp', 'https://chat.whatsapp.com/Hbm9wubODmw2ycWx5DTcMZ', '🟢', 0, true),
  ('Instagram', '', '📸', 1, false),
  ('YouTube', '', '📺', 2, false),
  ('TikTok', '', '🎵', 3, false),
  ('X / Twitter', '', '𝕏', 4, false),
  ('LinkedIn', '', '💼', 5, false),
  ('GitHub', 'https://github.com/Shinigamy19/Nexo-Digital', '🐙', 6, true);