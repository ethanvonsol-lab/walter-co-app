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
  const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { invited_by: admin.email, role: 'client' },
    redirectTo: origin ? `${origin}/set-password` : undefined,
  })

  if (invite.error && !/already.*registered/i.test(invite.error.message)) {
    return NextResponse.json({ error: invite.error.message }, { status: 400 })
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

  await logAudit(admin.email, 'client.create', client.id, { email, plan })

  return NextResponse.json({ id: client.id })
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
