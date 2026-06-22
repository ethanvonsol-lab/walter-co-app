-- Expanded onboarding: business, customer, offer, and sales-strategy data.
-- Day 1 of the "AI Sales Closer" rebuild. Run once in the Supabase SQL editor.
--
-- The original onboarding only captured `voice_profile` (how the client talks).
-- These columns capture what they sell and how the AI should sell it, so the
-- Instagram webhook can build a sales-focused system prompt per client.
-- See lib/sales-prompt.ts (buildSalesSystemPrompt) for how they're consumed.

alter table public.clients
  -- Section 2 — Business
  add column if not exists niche text,                 -- coach / real estate / creator / agency / e-commerce …
  add column if not exists content_type text,          -- educational / promotional / behind-the-scenes / demos
  add column if not exists content_volume text,        -- posts per week (free text)
  add column if not exists dm_volume text,             -- DMs per week (free text)
  add column if not exists offer text,                 -- main offer / service (brief)
  -- Section 3 — Customer & Offer
  add column if not exists ideal_customer text,         -- who they sell to (age, income, pain)
  add column if not exists price_point text,            -- $ | $$ | $$$
  add column if not exists main_objection text,         -- price | timing | trust | skepticism
  -- Section 4 — Goals & Behaviour
  add column if not exists main_goal text,              -- book_calls | drive_traffic | collect_emails | direct_sales
  add column if not exists ai_aggressiveness text,      -- soft | medium | hard
  add column if not exists lead_destination text,       -- Calendly / website / email / custom link
  -- Lifecycle: when the client finished the expanded onboarding.
  add column if not exists onboarded_at timestamptz;
