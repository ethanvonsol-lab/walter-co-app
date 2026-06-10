import { createBrowserClient } from '@supabase/ssr'

// Browser client for all `'use client'` components.
// `createBrowserClient` persists the auth session in cookies (not localStorage),
// so the server (proxy.ts, server components, route handlers) can read it too.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
