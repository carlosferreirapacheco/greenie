-- Mandatory, unique, customizable usernames.
--
-- - profiles.username: lowercase letters/digits/dot/underscore, starts
--   with a letter, ends with a letter or digit, 3-20 chars, dots and
--   underscores never doubled or adjacent to each other ("..", "__",
--   "._", "_." all rejected). Uniqueness is case-insensitive by
--   construction because only lowercase ever passes the format check.
-- - Change cooldown: one username change per N days, N read from the
--   new app_config table (single source of truth, not hardcoded in the
--   trigger), enforced by a before-update trigger so a modified client
--   can't bypass it. The first customization is always allowed
--   (username_changed_at starts null).
-- - Signup: handle_new_user() reads the username chosen on the sign-up
--   form from auth metadata; anything missing/invalid/taken falls back
--   to a generated id-based username instead of failing the signup, so
--   future signup paths without a username field (Google OAuth) keep
--   working and can customize later.

-- 1) Columns (backfill before constraints; the cooldown trigger doesn't
--    exist yet, so the backfill doesn't stamp username_changed_at).
alter table public.profiles add column username text;
alter table public.profiles add column username_changed_at timestamptz;

update public.profiles
set username = 'user_' || substr(id::text, 1, 8)
where username is null;

alter table public.profiles alter column username set not null;

-- Two-part format check: POSIX regexes have no lookaheads, so the
-- separator-adjacency rule is a second, negated pattern.
alter table public.profiles add constraint profiles_username_format check (
  username ~ '^[a-z][a-z0-9._]{1,18}[a-z0-9]$'
  and username !~ '[._]{2}'
);

alter table public.profiles add constraint profiles_username_unique unique (username);

-- 2) App-level config (currently just the username cooldown). Readable
--    by signed-in users so the client can show the same number the
--    trigger enforces; no client writes.
create table public.app_config (
  key text primary key,
  value text not null
);

alter table public.app_config enable row level security;

create policy app_config_select_authenticated on public.app_config
  for select to authenticated using (true);

insert into public.app_config (key, value)
values ('username_change_cooldown_days', '5');

-- 3) Username change cooldown.
create function public.enforce_username_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cooldown_days int;
  next_allowed timestamptz;
begin
  if new.username is distinct from old.username then
    select coalesce(
      (select value::int from public.app_config where key = 'username_change_cooldown_days'),
      5
    ) into cooldown_days;

    if old.username_changed_at is not null then
      next_allowed := old.username_changed_at + make_interval(days => cooldown_days);
      if now() < next_allowed then
        raise exception 'You can change your username again on %', to_char(next_allowed, 'FMMonth DD, YYYY');
      end if;
    end if;

    new.username_changed_at := now();
  end if;

  return new;
end;
$$;

create trigger enforce_username_cooldown_trigger
  before update on public.profiles
  for each row execute function public.enforce_username_cooldown();

-- 4) Signup wiring: profiles rows now need a username at insert time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  candidate := lower(trim(new.raw_user_meta_data->>'username'));

  if candidate is null
     or candidate !~ '^[a-z][a-z0-9._]{1,18}[a-z0-9]$'
     or candidate ~ '[._]{2}'
     or exists (select 1 from public.profiles where username = candidate) then
    candidate := 'user_' || substr(new.id::text, 1, 8);
  end if;

  -- The id-based fallback is unique for all practical purposes, but a
  -- signup must never fail on a freak collision.
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := 'user_' || substr(new.id::text, 1, 8) || floor(random() * 1000)::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5) Availability check for the sign-up screen, which runs before the
--    user exists -- the anon role can't (and shouldn't) read profiles,
--    and this exposes only a boolean.
create function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(candidate))
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
