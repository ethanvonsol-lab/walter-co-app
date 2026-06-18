import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, logAudit } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Admin sets a login password for a client directly — no email, no magic links.
// The admin shares the password with the client, who signs in at /login.
// This is the reliable onboarding path until SMTP/email is configured.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const { password } = await req.json()
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const { data: client } = await supabaseAdmin
    .from('clients').select('email').eq('id', id).maybeSingle()
  if (!client?.email) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Find the existing auth user by email (paginated; fine at launch scale).
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const user = list?.users.find(u => u.email?.toLowerCase() === client.email.toLowerCase())

  if (user) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    // No auth user yet — create one with this password, already confirmed.
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: client.email, password, email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await logAudit(admin.email, 'client.set_password', id, {})
  return NextResponse.json({ ok: true })
}
