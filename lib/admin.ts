import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from './supabase-admin'

// Server-side admin helpers. Use these in app/admin/* server components and
// app/api/admin/* route handlers.

export interface AdminUser {
  id: string
  email: string
  name: string | null
  clientId: string
}

// Reads the current user from cookies and confirms they have is_admin=true on
// their clients row. Returns null when not authed or not an admin.
export async function getAdmin(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only — proxy.ts handles session refresh.
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  // Use the service-role client so the lookup is not bound by RLS — admins may
  // not have a session row visible under their own anon scope yet.
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, is_admin')
    .eq('email', user.email)
    .maybeSingle()

  if (!client?.is_admin) return null

  return {
    id: user.id,
    email: user.email,
    name: client.name,
    clientId: client.id,
  }
}

// Writes an audit log entry. Fire-and-forget — failures are logged, not thrown,
// so they don't break the action that triggered them.
export async function logAudit(
  actorEmail: string,
  action: string,
  targetClientId: string | null,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    actor_email: actorEmail,
    action,
    target_client_id: targetClientId,
    meta,
  })
  if (error) console.error('audit log failed:', error.message)
}
