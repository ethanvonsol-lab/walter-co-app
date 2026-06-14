import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Next.js 16 renamed Middleware to Proxy. This runs on the nodejs runtime.
// It reads the Supabase auth session from cookies, refreshes it if needed,
// and protects dashboard/widget routes from unauthenticated access.
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write refreshed session cookies onto both the request (for any
          // downstream read) and the response (sent back to the browser).
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the token with Supabase and refreshes it when expired.
  // Do not run other logic between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname
  const isProtected =
    path.startsWith('/dashboard') ||
    path.startsWith('/widget') ||
    path.startsWith('/admin')

  if (isProtected && !user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Admin gate — coarse check at the proxy. The per-page server check in
  // app/admin/layout.tsx is the source of truth (it uses the service-role
  // client). We block obvious non-admins here so they never hit a render.
  if (path.startsWith('/admin') && user?.email) {
    const { data: client } = await supabase
      .from('clients')
      .select('is_admin')
      .eq('email', user.email)
      .maybeSingle()
    if (!client?.is_admin) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/widget/:path*', '/admin/:path*'],
}
