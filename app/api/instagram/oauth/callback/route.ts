import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Step 2 of self-serve Instagram connection.
// Instagram redirects here with `?code=...&state=...`. We:
//   1. verify the CSRF state cookie,
//   2. identify the client from their Supabase session,
//   3. exchange the code for a short-lived token (+ ig user_id),
//   4. upgrade it to a long-lived token (~60 days),
//   5. store access_token + instagram_account_id on their clients row.

export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  const done = (q: string) => NextResponse.redirect(`${origin}/dashboard/connections?${q}`)

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const cookieState = req.cookies.get('ig_oauth_state')?.value
  if (!code) return done('error=oauth_denied')
  if (!state || state !== cookieState) return done('error=oauth_state_mismatch')

  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appId || !appSecret) return done('error=oauth_not_configured')

  // Identify the logged-in client from their session cookie.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() { /* read-only here */ },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return done('error=not_signed_in')

  const redirectUri = `${origin}/api/instagram/oauth/callback`

  try {
    // 3. short-lived token + ig user_id
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    })
    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const shortData = await shortRes.json()
    if (!shortRes.ok || !shortData.access_token) {
      console.error('IG token exchange failed:', shortData)
      return done('error=token_exchange_failed')
    }
    const igUserId = String(shortData.user_id)

    // 4. long-lived token (~60 days)
    const longUrl = new URL('https://graph.instagram.com/access_token')
    longUrl.searchParams.set('grant_type', 'ig_exchange_token')
    longUrl.searchParams.set('client_secret', appSecret)
    longUrl.searchParams.set('access_token', shortData.access_token)
    const longRes = await fetch(longUrl.toString())
    const longData = await longRes.json()
    const accessToken = longData.access_token || shortData.access_token

    // 5. persist on the client's row (service-role; bypasses RLS)
    const { error } = await supabaseAdmin
      .from('clients')
      .update({ instagram_account_id: igUserId, access_token: accessToken })
      .eq('email', user.email)
    if (error) {
      console.error('IG connect save failed:', error.message)
      return done('error=save_failed')
    }

    const res = done('connected=1')
    res.cookies.delete('ig_oauth_state')
    return res
  } catch (e) {
    console.error('IG oauth callback error:', e)
    return done('error=oauth_error')
  }
}
