-- Stripe billing columns on clients.
-- Run once in the Supabase SQL editor.

alter table public.clients
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  -- billing lifecycle, distinct from the operational `status`:
  -- none | trialing | active | past_due | canceled
  add column if not exists billing_status text not null default 'none';

create index if not exists clients_stripe_customer_idx on public.clients (stripe_customer_id);
create index if not exists clients_stripe_subscription_idx on public.clients (stripe_subscription_id);
