-- Paste this into Supabase → SQL Editor → Run.
-- The app talks to Postgres from the server with the service_role key.
-- Row Level Security is on and there are no anon policies, so the public API cannot read these tables.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pinterest_connections (
  user_id uuid primary key references public.users (id) on delete cascade,
  pinterest_id text not null,
  username text not null,
  profile_image text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null
);

create table if not exists public.boards (
  user_id uuid not null references public.users (id) on delete cascade,
  board_id text not null,
  name text not null,
  cover_url text,
  pin_count integer,
  source text not null check (source in ('pinterest', 'demo', 'rss')),
  feed_url text,
  primary key (user_id, board_id)
);

create table if not exists public.board_links (
  user_id uuid not null references public.users (id) on delete cascade,
  link_id text not null,
  feed_url text not null,
  name text not null,
  kind text not null check (kind in ('board', 'profile')),
  created_at timestamptz not null default now(),
  primary key (user_id, link_id)
);

alter table public.users enable row level security;
alter table public.pinterest_connections enable row level security;
alter table public.boards enable row level security;
alter table public.board_links enable row level security;
