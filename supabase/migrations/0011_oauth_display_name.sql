-- Seed display_name from OAuth metadata on signup.
--
-- Fourth revision of handle_new_user() (0005 created it, 0009 added the
-- username, 0010 the consent stamp): Google (and other OAuth providers)
-- put the user's name in raw_user_meta_data as full_name (sometimes
-- name); email/password signups send neither, so their display_name
-- stays null exactly as before. Username logic untouched -- OAuth
-- signups get the generated user_<id-prefix> username and customize it
-- cooldown-free on the welcome screen.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  consented_at timestamptz;
  oauth_name text;
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

  consented_at := case
    when new.raw_user_meta_data->>'privacy_accepted' = 'true' then now()
    else null
  end;

  oauth_name := nullif(trim(coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  )), '');

  insert into public.profiles (id, username, accepted_privacy_at, display_name)
  values (new.id, candidate, consented_at, oauth_name)
  on conflict (id) do nothing;
  return new;
end;
$$;
