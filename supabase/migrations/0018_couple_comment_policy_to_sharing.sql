-- comment_policy and shared_to_feed were fully independent (migration
-- 0012), so an owner could leave comments enabled on a report they'd
-- deliberately kept out of every feed. Two rules tie them together:
-- unlisting turns comments off, and unlisting is permanent.

-- 1. Backfill existing rows so the new CHECK constraint below doesn't
-- fail on data that predates this rule.
update public.plant_progress
set comment_policy = 'disabled'
where not shared_to_feed and comment_policy <> 'disabled';

-- 2. An unlisted report can never have comments enabled. One-
-- directional: disabling comments on an otherwise-shared report stays
-- perfectly legal.
alter table public.plant_progress
  add constraint plant_progress_unlisted_implies_comments_disabled
  check (shared_to_feed or comment_policy = 'disabled');

-- 3. Unlisting is one-way -- a report that's been unlisted can never
-- be shared to the feed again. A CHECK constraint can't compare OLD
-- vs NEW, so this needs a trigger. Combined with (2), comment_policy
-- is transitively locked to 'disabled' forever too once unlisted --
-- no separate one-way rule needed for it.
create function public.prevent_reshare_after_unlist()
returns trigger
language plpgsql
as $$
begin
  if not OLD.shared_to_feed and NEW.shared_to_feed then
    raise exception 'A report that has been unlisted can''t be shared to the feed again';
  end if;
  return NEW;
end;
$$;

create trigger prevent_reshare_after_unlist
before update on public.plant_progress
for each row execute function public.prevent_reshare_after_unlist();
