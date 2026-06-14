import { createClient } from '@supabase/supabase-js'

// Service-role client. **NEVER import this from a client component.** It
// bypasses RLS and can create/delete auth users. Only used in /api/admin/* and
// server components under /admin that have already verified the caller is an
// admin.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
