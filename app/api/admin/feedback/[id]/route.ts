import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, logAudit } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Admin-only updates to a feedback item: change status/priority, or delete it.

const ALLOWED = new Set(['status', 'priority'])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) patch[k] = v
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('feedback').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logAudit(admin.email, 'feedback.update', null, { id, fields: Object.keys(patch) })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const { error } = await supabaseAdmin.from('feedback').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logAudit(admin.email, 'feedback.delete', null, { id })
  return NextResponse.json({ ok: true })
}
