import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, logAudit } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const { error } = await supabaseAdmin.from('daily_messages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logAudit(admin.email, 'daily_message.delete', null, { id })
  return NextResponse.json({ ok: true })
}
