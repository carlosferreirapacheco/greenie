-- Durable, queryable error logs for the lookup-plant Edge Function, so
-- failure causes remain diagnosable past Supabase's own ~24h log
-- retention window. Write-only from the client's perspective: each
-- caller can insert only their own row (via the JWT the Edge Function
-- forwards, not a service-role key); there is no select/update/delete
-- policy for anon/authenticated, so reads happen only via SQL/MCP.
create table public.ai_lookup_error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  lookup_type text not null check (lookup_type in ('query', 'photo')),
  stage text not null,
  status_code int not null,
  error_message text not null,
  input_summary text,
  locale text
);

alter table public.ai_lookup_error_logs enable row level security;

create policy "ai_lookup_error_logs_insert_own" on public.ai_lookup_error_logs
for insert to authenticated
with check ( (select auth.uid()) = user_id );
