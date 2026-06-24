-- Day 3: structured lead profiling.
-- The AI already works qualifying questions into the DM (budget, timeline, the
-- prospect's pain). This stores what it learns per lead so it shows on the lead
-- detail card. Fields are extracted from the conversation by /api/leads/enrich
-- (Opus, JSON) and cached; enriched_at marks that it's been analysed.
alter table public.leads
  add column if not exists budget_range text,
  add column if not exists timeline text,
  add column if not exists pain_point text,
  add column if not exists decision_maker text,
  add column if not exists enriched_at timestamptz;
