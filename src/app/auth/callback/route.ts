import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Auth callback handler for Supabase OAuth and magic link flows.
 *
 * Flow:
 * 1. User completes auth with provider (e.g. Google, LINE)
 * 2. Supabase redirects to /auth/callback?code=...
 * 3. This handler exchanges the code for a session
 * 4. Redirects to '/' on success or '/login?error=auth' on failure
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method can fail in edge cases where the
              // response has already been committed. This is safe to
              // ignore here — the middleware handles session refresh.
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful auth — redirect to the intended destination
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // In development, don't use x-forwarded-host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // In production behind a reverse proxy
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Auth failed — redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
