-- Real OS push notifications on top of the notifications inbox
-- (migration 0019): every inserted notification row is forwarded,
-- fire-and-forget, to the send-push Edge Function, which delivers it
-- to the recipient's registered devices via Expo's push service.
-- Care-task reminders move server-side too: an hourly pg_cron scan
-- creates 'care_due' notification rows (inbox + push through the same
-- pipeline), replacing the app's local on-device scheduling.

-- 1. Extensions: async HTTP from triggers + the cron scheduler.
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2. Device push tokens. One row per device; the token itself is the
-- key, so a device that switches accounts upserts and re-owns it.
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy push_tokens_select_own on public.push_tokens
  for select
  using (auth.uid() = user_id);

create policy push_tokens_insert_own on public.push_tokens
  for insert
  with check (auth.uid() = user_id);

-- using (true) is deliberate: when a device switches accounts its
-- token row still belongs to the previous user, and the new user's
-- upsert must be able to take the row over. The token string is
-- device-private (never displayed anywhere), so knowing it is itself
-- the proof of holding the device; with check still pins the new
-- owner to the caller.
create policy push_tokens_update_any on public.push_tokens
  for update
  using (true)
  with check (auth.uid() = user_id);

create policy push_tokens_delete_own on public.push_tokens
  for delete
  using (auth.uid() = user_id);

-- 3. The care_due notification kind: no actor (it's the system, not a
-- person), a plant to deep-link to, and the task type for the message.
alter table public.notifications alter column actor_id drop not null;

alter table public.notifications
  add column plant_id uuid references public.plants(id) on delete cascade,
  add column care_task_type text;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'comment', 'like', 'follow_request', 'new_follower',
    'follow_accepted', 'sitting_request', 'sitting_accepted', 'sitting_declined',
    'care_due'
  ));

-- 4. The 8th per-kind preference (account-wide, like the other seven;
-- replaces the app's old device-local care-reminders toggle).
alter table public.profiles
  add column notify_care_tasks boolean not null default true;

-- 5. Forward every new notification to the send-push Edge Function.
-- Best-effort by design: the secret missing or the HTTP queueing
-- failing must never break the insert that created the notification
-- (which would take the comment/like/follow itself down with it).
-- The bearer secret lives in Vault ('push_webhook_secret', created at
-- setup time, never in this repo); send-push compares it against its
-- PUSH_WEBHOOK_SECRET function secret.
create function public.push_notification_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  webhook_secret text;
begin
  begin
    select decrypted_secret into webhook_secret
    from vault.decrypted_secrets
    where name = 'push_webhook_secret';

    if webhook_secret is not null then
      perform net.http_post(
        url := 'https://bcmlhuljvuvrpylfdrkk.supabase.co/functions/v1/send-push',
        body := jsonb_build_object('notification_id', new.id),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || webhook_secret
        )
      );
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger push_notification_webhook_trigger
after insert on public.notifications
for each row execute function public.push_notification_webhook();

-- 6. Hourly care-task scan: one care_due notification per task whose
-- next_due arrived within the last hour -- fires exactly once per due
-- moment with no state (marking done / editing frequency moves
-- next_due, which the scan naturally picks up). Recipient is the
-- plant's owner, gated on their notify_care_tasks preference just
-- like the social triggers gate on theirs. Accepted trade-off: the
-- reminder lands within the hour after next_due, not at the exact
-- minute. Owner only for now -- notifying active plant sitters too is
-- a possible future enhancement.
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
    and (select notify_care_tasks from public.profiles where id = p.owner_id)
  $job$
);
