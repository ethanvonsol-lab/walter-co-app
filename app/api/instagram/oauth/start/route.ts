import { NextRequest, NextResponse } from 'next/server'

// Step 1 of self-serve Instagram connection.
// Redirects the (already logged-in) client to Instagram's OAuth dialog. After
// they approve, Instagram redirects back to /api/instagram/oauth/callback with
// a `code`. Identity is carried by the client's Supabase session cookie, which
// the callback reads — `state` here is just CSRF protection.
//
// Requires a Meta app with Instagram API set up:
//   INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET  (app credentials)
//   NEXT_PUBLIC_SITE_URL                     (e.g. https://walter-co-app.vercel.app)
// and the callback URL registered as a valid OAuth redirect URI in the app.

export async function GET(req: NextRequest) {
  const appId = process.env.INSTAGRAM_APP_ID
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin
  if (!appId) {
    return NextResponse.redirect(`${origin}/dashboard/connections?error=oauth_not_configured`)
  }

  const redirectUri = `${origin}/api/instagram/oauth/callback`
  const state = crypto.randomUUID()

  const authUrl = new URL('https://www.instagram.com/oauth/authorize')
  authUrl.searchParams.set('client_id', appId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_messages')
  authUrl.searchParams.set('state', state)

  const res = NextResponse.redirect(authUrl.toString())
  // Short-lived CSRF cookie, verified in the callback.
  res.cookies.set('ig_oauth_state', state, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/',
  })
  return res
}
