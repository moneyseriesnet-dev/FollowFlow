import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Public routes that do NOT require authentication.
 * Everything else redirects to /login when unauthenticated.
 */
const PUBLIC_ROUTES = ['/login', '/auth/callback']

function isPublicRoute(pathname: string): boolean {
  // Exact matches
  if (PUBLIC_ROUTES.includes(pathname)) return true
  // API routes are always public (protected by their own auth checks)
  if (pathname.startsWith('/api/')) return true
  return false
}

/**
 * Refreshes the Supabase auth session and protects routes.
 *
 * IMPORTANT: This must run on every request to keep sessions alive.
 * The getAll/setAll pattern ensures token refreshes are properly
 * written back to the response cookies.
 */
export async function updateSession(request: NextRequest) {
  // Start with a fresh response that forwards the original request headers
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          // 1. Set cookies on the request (so downstream server components see them)
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )

          // 2. Recreate the response to carry the updated request cookies
          supabaseResponse = NextResponse.next({
            request,
          })

          // 3. Set cookies on the response (so the browser stores them)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )

          // 4. Set cache-busting headers from the library
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use getSession() here — it reads from cookies
  // without server validation. getUser() contacts the Auth server to
  // verify the token and triggers the token refresh if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
