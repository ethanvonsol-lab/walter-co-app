-- Day 2 extras: real-time lead notifications (2.5) + Discord integration (2.6).
-- Run once in the Supabase SQL editor.

-- ── Notifications ────────────────────────────────────────────────────────────
-- One row per dashboard notification (currently: a lead was detected). The
-- webhook inserts; the client dashboard reads its own + subscribes for realtime.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  type text not null default 'lead',     -- lead | system
  title text not null,
  body text,
  lead_id uuid references public.leads(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_client_idx on public.notifications (client_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (client_id, read);

alter table public.notifications enable row level security;
-- Mirrors the app's existing anon-access model (webhook + dashboard use the anon
-- key). Tighten to your own auth/RLS model if you lock the other tables down.
create policy "notifications read"   on public.notifications for select using (true);
create policy "notifications insert" on public.notifications for insert with check (true);
create policy "notifications update" on public.notifications for update using (true) with check (true);

-- Realtime: let the dashboard receive INSERTs live (same as messages/leads).
-- Safe to re-run — ignore the "already member" notice if it appears.
alter publication supabase_realtime add table public.notifications;

-- ── Discord integration ──────────────────────────────────────────────────────
-- Optional per-client Discord incoming-webhook URL. When set, new leads (and
-- broken-token alerts) get posted to the client's Discord channel.
alter table public.clients
  add column if not exists discord_webhook_url text;
