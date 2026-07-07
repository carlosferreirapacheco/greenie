-- User profile data (display name, bio, avatar) keyed to auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- profiles: publicly readable (needed for social features to show author
-- names), only the profile's own user can write
create policy "profiles_select_all" on profiles
  for select using (true);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Backfill: give the existing hardcoded dev user a profile row. No trigger
-- for future sign-ups yet — that's wired in when real auth is built.
insert into profiles (id)
select id from auth.users
on conflict (id) do nothing;
