import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, logAudit } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Create a new client account.
//
// Two-step: (1) create a Supabase auth user and send them an invite email so
// they can set a password / log in, (2) insert their `clients` row. We do auth
// first because if the email is already in use we want to abort before writing.
export async function POST(req: NextRequest) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    name, email, industry, plan, mrr, setup_fee, agency_id,
    instagram_account_id, access_token, voice_profile, avg_deal_value, notes,
  } = body as Record<string, string | number | null>

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  // Invite — sends an email with a one-time link that lands them on
  // /set-password, where they choose a password and continue to the dashboard.
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || ''
  const alreadyRegistered = (msg: string) => /already.*regist|already been regist|email.*exists/i.test(msg)

  // Preferred path: invite by email (creates the user + emails a set-password
  // link). But if email delivery isn't configured yet (no SMTP / no domain),
  // that errors — so we fall back to creating the user directly with NO email,
  // and the admin onboards them via the "View as client" magic link instead.
  // Either way, account creation never blocks on email.
  let emailSent = false
  const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { invited_by: admin.email, role: 'client' },
    redirectTo: origin ? `${origin}/set-password` : undefined,
  })

  if (!invite.error) {
    emailSent = true
  } else if (!alreadyRegistered(invite.error.message)) {
    // Invite failed (most likely email send). Create the auth user without email.
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { invited_by: admin.email, role: 'client' },
    })
    if (created.error && !alreadyRegistered(created.error.message)) {
      return NextResponse.json({ error: created.error.message }, { status: 400 })
    }
  }

  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .insert({
      name: name || null,
      email,
      industry: industry || null,
      plan: plan || 'direct',
      mrr: Number(mrr) || 0,
      setup_fee: Number(setup_fee) || 0,
      avg_deal_value: Number(avg_deal_value) || 1500,
      agency_id: agency_id || null,
      instagram_account_id: instagram_account_id || null,
      access_token: access_token || null,
      voice_profile: voice_profile || null,
      notes: notes || null,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Seed an AI-enabled default for the brand-new account so the webhook is
  // explicit (it defaults to enabled when no row exists, but being explicit
  // makes the inbox toggle work from day one).
  await supabaseAdmin.from('conversation_settings').insert({
    client_id: client.id, from_username: '__default__', ai_enabled: true,
  }).select().maybeSingle()

  await logAudit(admin.email, 'client.create', client.id, { email, plan, emailSent })

  return NextResponse.json({ id: client.id, emailSent })
}

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { data } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, status, plan, mrr, agency_id, created_at')
    .order('created_at', { ascending: false })
  return NextResponse.json({ clients: data ?? [] })
}
