-- Access control for the (future, separate) admin backoffice app --
-- see docs/admin-dashboard-backlog.md's "Prerequisite: access control"
-- section for the full design. is_admin is deliberately unreachable
-- from the normal client update path: profiles_update_own
-- (0002_profiles.sql) is `using (auth.uid() = id)` with no `with
-- check` at all, so without a guard any signed-in user could
-- self-grant admin through the exact same `supabase.from("profiles")
-- .update(...)` call updateProfile() already uses for bio/display
-- name. The trigger below silently reverts any client-submitted
-- change to this one column, regardless of what the UPDATE policy
-- itself allows -- only a service-role client (or direct SQL) can
-- actually change it.
alter table public.profiles
  add column is_admin boolean not null default false;

-- SECURITY INVOKER (the default, and this project's own preferred
-- default per the security checklist): the function needs no elevated
-- privileges, and SECURITY DEFINER would make current_user inside the
-- function body evaluate to the function's *owner*, not the invoking
-- role -- which would silently defeat this exact check.
create or replace function public.guard_is_admin()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger guard_is_admin_before_update
  before update on public.profiles
  for each row
  execute function public.guard_is_admin();

-- Seed the first admin -- a one-time, deliberate data change, not a
-- feature. Runs as the migration/superuser role, which the guard above
-- deliberately does not restrict.
update public.profiles
  set is_admin = true
  where id = 'd97979b8-e8e0-4b0e-8086-6e5de4a71a06';
