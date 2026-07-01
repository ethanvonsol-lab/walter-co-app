-- Engagement features: troll auto-disengage + quiet-lead follow-ups.
-- Run once in the Supabase SQL editor.

-- Why a conversation is paused: 'owner' (you replied by hand) vs 'troll' (the AI
-- disengaged from someone messing with it). Lets us auto-re-engage trolls who
-- later show real intent, without ever overriding an owner pause.
alter table public.conversation_settings
  add column if not exists paused_reason text;

-- When we sent an automated "you went quiet" follow-up for a lead, so we never
-- nag the same person twice.
alter table public.leads
  add column if not exists followup_sent_at timestamptz;
create index if not exists leads_followup_idx on public.leads (status, followup_sent_at);
