-- Real Instagram @usernames. The webhook only receives the sender's numeric
-- IGSID, so the inbox/leads were showing numbers. We look up the @handle from
-- the Graph API and cache it here. Run once in the Supabase SQL editor.
alter table public.messages add column if not exists from_handle text;
alter table public.leads    add column if not exists from_handle text;

create index if not exists messages_handle_lookup_idx
  on public.messages (client_id, from_username);
