import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { resolveIgUsername } from '@/lib/ig-username'

// Lazily resolve + cache the @username for an existing conversation (IGSID) so
// older inbox/leads rows stop showing numbers. Called from the dashboard for
// any conversation that doesn't have a handle yet.
export async function POST(req: NextRequest) {
  const { clientId, igsid } = await req.json()
  if (!clientId || !igsid) return NextResponse.json({ handle: null })

  // Already cached on another row?
  const { data: cached } = await supabase
    .from('messages')
    .select('from_handle')
    .eq('client_id', clientId)
    .eq('from_username', igsid)
    .not('from_handle', 'is', null)
    .limit(1)
    .maybeSingle()
  if (cached?.from_handle) return NextResponse.json({ handle: cached.from_handle })

  const { data: client } = await supabase.from('clients').select('access_token').eq('id', clientId).maybeSingle()
  const token = client?.access_token || process.env.INSTAGRAM_ACCESS_TOKEN || ''
  const handle = await resolveIgUsername(igsid, token)

  if (handle) {
    await supabase.from('messages').update({ from_handle: handle }).eq('client_id', clientId).eq('from_username', igsid)
    await supabase.from('leads').update({ from_handle: handle }).eq('client_id', clientId).eq('from_username', igsid)
  }
  return NextResponse.json({ handle })
}
