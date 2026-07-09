-- GDPR consent tracking: record when a user accepted the privacy policy.
--
-- Set at signup from auth metadata (the sign-up form's required consent
-- checkbox passes privacy_accepted: true alongside the username).
-- Existing users keep null -- nothing gates on it yet; prompting
-- pre-existing users for consent is a tracked backlog item.

alter table public.profiles add column accepted_privacy_at timestamptz;

-- Third revision of handle_new_user() (0005 created it, 0009 added the
-- username): unchanged except for stamping accepted_privacy_at when the
-- signup metadata carries the consent flag.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  consented_at timestamptz;
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

  insert into public.profiles (id, username, accepted_privacy_at)
  values (new.id, candidate, consented_at)
  on conflict (id) do nothing;
  return new;
end;
$$;
