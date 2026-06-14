import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, logAudit } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED = new Set([
  'name', 'email', 'industry', 'plan', 'mrr', 'setup_fee', 'avg_deal_value',
  'agency_id', 'instagram_account_id', 'access_token', 'voice_profile',
  'notes', 'status', 'is_admin',
])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) patch[k] = v
  }

  if (patch.status === 'paused') patch.paused_at = new Date().toISOString()
  if (patch.status === 'active') patch.paused_at = null

  const { error } = await supabaseAdmin.from('clients').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logAudit(admin.email, 'client.update', id, { fields: Object.keys(patch) })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params

  // Fetch email so we can clean up the auth user too.
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('email')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabaseAdmin.from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Best-effort: remove their auth user. Skip silently if not found.
  if (client?.email) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers()
    const u = list?.users.find(u => u.email === client.email)
    if (u) await supabaseAdmin.auth.admin.deleteUser(u.id)
  }

  await logAudit(admin.email, 'client.delete', null, { email: client?.email, id })
  return NextResponse.json({ ok: true })
}
