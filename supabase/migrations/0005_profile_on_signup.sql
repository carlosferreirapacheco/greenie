-- Auto-create a blank profiles row for every new auth.users row, so
-- real sign-up (email/password now, OAuth providers later) doesn't need
-- each signup path to remember to do this client-side.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
