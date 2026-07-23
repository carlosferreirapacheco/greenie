-- Durable error logging for Edge Functions other than lookup-plant
-- (which already has its own richer ai_lookup_error_logs table,
-- migration 0021, left untouched here). Same reasoning: Supabase's
-- own function/auth logs only retain ~24h, so a systemic problem
-- needs somewhere durable to land -- feeds the backoffice's
-- observability dashboard.
create table public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('push', 'email_export', 'account_deletion')),
  user_id uuid references auth.users(id) on delete set null,
  detail text,
  error_message text not null,
  created_at timestamptz not null default now()
);

alter table public.app_error_logs enable row level security;

-- Deliberately no client policies at all (not even insert-as-self,
-- unlike ai_lookup_error_logs) -- every writer holds a service-role
-- client, which bypasses RLS regardless. Reads are backoffice-only
-- via its own service-role client.
