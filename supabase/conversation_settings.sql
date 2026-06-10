-- Per-conversation AI on/off switch.
-- Run this once in the Supabase SQL editor to enable persistent per-person
-- AI pausing from the inbox. Until it exists, the webhook safely defaults to
-- AI-enabled and the inbox toggles work in-session only.

create table if not exists public.conversation_settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  from_username text not null,
  ai_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (client_id, from_username)
);

alter table public.conversation_settings enable row level security;

-- These mirror the app's existing anon-access model (the webhook and dashboard
-- already read/write clients, messages, and leads with the anon key). Tighten
-- to your own auth/RLS model if you lock the other tables down.
create policy "conversation_settings read" on public.conversation_settings
  for select using (true);
create policy "conversation_settings insert" on public.conversation_settings
  for insert with check (true);
create policy "conversation_settings update" on public.conversation_settings
  for update using (true) with check (true);
