import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, logAudit } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Generates a one-time magic-link URL for the client's email. Open it in a
// private/incognito window to view the app *as them* without touching your
// own session. The link is single-use and expires per Supabase defaults.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await ctx.params

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('email')
    .eq('id', id)
    .maybeSingle()
  if (!client?.email) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: client.email,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await logAudit(admin.email, 'client.impersonate', id, { email: client.email })
  return NextResponse.json({ url: data.properties?.action_link })
}
