-- Admin dashboard schema.
-- Run this once in the Supabase SQL editor. After it runs, flip is_admin=true
-- on your own clients row to unlock /admin.

-- Admin flag + commercial / lifecycle columns on clients.
-- These power the revenue board, churn signals, and the create-client flow.
alter table public.clients
  add column if not exists is_admin boolean not null default false,
  add column if not exists plan text not null default 'direct',
  add column if not exists mrr integer not null default 0,
  add column if not exists setup_fee integer not null default 0,
  add column if not exists avg_deal_value integer not null default 1500,
  add column if not exists status text not null default 'active',
  add column if not exists paused_at timestamptz,
  add column if not exists notes text;

create index if not exists clients_is_admin_idx on public.clients (is_admin);
create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_agency_id_idx on public.clients (agency_id);

-- Append-only audit trail for every admin write action.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,                -- e.g. 'client.create', 'client.pause', 'token.rotate'
  target_client_id uuid references public.clients(id) on delete set null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_target_idx on public.audit_log (target_client_id);

-- Nightly IG-token health snapshots from /api/admin/health-check.
-- One row per client per check — keeps a history for the health page.
create table if not exists public.ig_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  connected boolean not null,
  username text,
  reason text,
  error text,
  checked_at timestamptz not null default now()
);
create index if not exists ig_health_client_checked_idx
  on public.ig_health_snapshots (client_id, checked_at desc);

-- RLS: mirrors the rest of the app (anon-access reads). Writes happen through
-- the service-role client in /api/admin/*, which bypasses RLS anyway.
alter table public.audit_log enable row level security;
alter table public.ig_health_snapshots enable row level security;

create policy "audit_log read" on public.audit_log for select using (true);
create policy "ig_health read" on public.ig_health_snapshots for select using (true);
