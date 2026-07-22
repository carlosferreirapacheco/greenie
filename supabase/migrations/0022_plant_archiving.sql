-- Archive / restore / delete plants. Archiving is a reversible pause
-- (hides from the normal Plants list, stops generating care_due
-- notifications); delete is the real, permanent removal, only exposed
-- once a plant is archived. No RLS changes needed -- plants_update_own
-- and plants_delete_own (0001_init.sql) are already unrestricted
-- owner-can-update/delete-their-own-row policies, and archived/active
-- is purely a client-side filter, not an access-control concern.
alter table public.plants
  add column archived_at timestamptz;

-- Redefine the hourly care-task scan (originally 0020_push_notifications.sql)
-- to skip archived plants -- otherwise archiving wouldn't actually stop
-- care_due notifications. Re-calling cron.schedule with the same job
-- name replaces the existing job, same mechanism it was first created
-- with.
select cron.schedule(
  'care-due-scan',
  '0 * * * *',
  $job$
  insert into public.notifications (recipient_id, type, plant_id, care_task_type)
  select p.owner_id, 'care_due', ct.plant_id, ct.type
  from public.care_tasks ct
  join public.plants p on p.id = ct.plant_id
  where ct.next_due <= now()
    and ct.next_due > now() - interval '1 hour'
    and p.archived_at is null
    and (select notify_care_tasks from public.profiles where id = p.owner_id)
  $job$
);
