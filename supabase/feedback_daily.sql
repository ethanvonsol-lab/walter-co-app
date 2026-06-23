-- Day 2 tables: client feedback + daily broadcast messages.
-- Run once in the Supabase SQL editor.

-- ── Client feedback ──────────────────────────────────────────────────────────
-- Clients submit bugs / ideas / tweak requests from their dashboard. Ethan
-- triages them at /admin/feedback (which reads via the service-role client and
-- bypasses RLS). Clients only ever INSERT — the dashboard never reads feedback
-- back, so anon select stays closed (no cross-client leakage).
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  type text not null default 'bug',          -- bug | idea | tweak
  title text not null,
  details text,
  priority text not null default 'medium',   -- low | medium | high
  status text not null default 'new',        -- new | in_progress | done
  created_at timestamptz not null default now()
);
create index if not exists feedback_status_idx on public.feedback (status);
create index if not exists feedback_client_idx on public.feedback (client_id);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
-- Anon (the client dashboard) may submit, but not read or edit. Admin writes/
-- reads go through the service-role client, which bypasses RLS entirely.
create policy "feedback insert" on public.feedback for insert with check (true);

-- ── Daily messages ───────────────────────────────────────────────────────────
-- A short note Ethan posts that shows on every client's dashboard ("Today from
-- Ethan"). Broadcast to all clients, so anon read is fine; only the admin
-- service-role client writes.
create table if not exists public.daily_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_by text,                            -- admin email
  created_at timestamptz not null default now()
);
create index if not exists daily_messages_created_at_idx on public.daily_messages (created_at desc);

alter table public.daily_messages enable row level security;
create policy "daily_messages read" on public.daily_messages for select using (true);
