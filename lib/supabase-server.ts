import { createClient } from '@supabase/supabase-js'

// Server client for machine-to-machine route handlers (Instagram webhook, widget API).
// These requests carry no user session, so they don't need cookie-based auth —
// they talk to Supabase directly with the anon key.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
