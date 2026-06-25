-- Reply delay. How long the AI waits before sending its reply, so it feels
-- human instead of instant/botty. Run once in the Supabase SQL editor.
--
-- 0 = reply instantly (default). Capped at 45s in the app — the webhook holds
-- the reply in the background via Next.js after() (no cron needed), bounded by
-- the function's maxDuration.
alter table public.clients
  add column if not exists reply_delay_seconds integer not null default 0;
