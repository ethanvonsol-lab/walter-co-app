import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Verifies a client's Instagram connection live against Meta's Graph API.
// Uses the client's own access_token if they've connected one, otherwise falls
// back to the global INSTAGRAM_ACCESS_TOKEN (the current single-account setup).
export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json()
    if (!clientId) return NextResponse.json({ connected: false, reason: 'no_client' })

    const { data: client } = await supabase
      .from('clients')
      .select('instagram_account_id, access_token')
      .eq('id', clientId)
      .maybeSingle()

    const token = client?.access_token || process.env.INSTAGRAM_ACCESS_TOKEN || ''
    const usingGlobalToken = !client?.access_token

    // Message activity for this client (independent of the token check).
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const base = {
      usingGlobalToken,
      storedAccountId: client?.instagram_account_id || null,
      messageCount: count ?? 0,
      lastMessageAt: lastMsg?.created_at || null,
      webhookConfigured: !!process.env.WEBHOOK_VERIFY_TOKEN,
    }

    if (!token) {
      return NextResponse.json({ ...base, connected: false, reason: 'no_token' })
    }

    // Live check — does Meta recognise this token, and which account is it?
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`
    )
    const data = await res.json()

    if (res.ok && data.user_id) {
      return NextResponse.json({
        ...base,
        connected: true,
        username: data.username || null,
        liveAccountId: String(data.user_id),
        matchesStored: base.storedAccountId ? String(data.user_id) === String(base.storedAccountId) : null,
      })
    }

    return NextResponse.json({
      ...base,
      connected: false,
      reason: 'token_rejected',
      error: data?.error?.message || `Graph API returned ${res.status}`,
    })
  } catch (error) {
    console.error('IG status error:', error)
    return NextResponse.json({ connected: false, reason: 'error', error: 'Could not check connection.' }, { status: 200 })
  }
}
