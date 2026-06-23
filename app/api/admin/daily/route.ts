import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, logAudit } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Post a new daily note. Shows on every client's dashboard ("Today from Ethan").
export async function POST(req: NextRequest) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { message } = await req.json()
  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('daily_messages')
    .insert({ message: message.trim(), created_by: admin.email })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logAudit(admin.email, 'daily_message.create', null, { id: data.id })
  return NextResponse.json({ ok: true, message: data })
}
