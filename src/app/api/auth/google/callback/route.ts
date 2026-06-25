import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/calendar/google-calendar-service'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/settings/calendar?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/settings/calendar?error=missing_auth_code`)
  }

  try {
    const supabase = (await createClient()) as any
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.redirect(`${origin}/login?redirect=/settings/calendar`)
    }

    // Exchange auth code for tokens
    const tokens = await exchangeCodeForTokens(code, origin)

    // Fetch existing credentials to preserve refresh_token if Google does not return a new one
    const { data: existingCreds } = await supabase
      .from('google_credentials')
      .select('refresh_token')
      .eq('owner_id', user.id)
      .maybeSingle()

    const refreshToken = tokens.refresh_token || existingCreds?.refresh_token

    if (!refreshToken) {
      throw new Error('No refresh token received from Google. Please disconnect this app in your Google Account Security settings and reconnect.')
    }

    const { error: upsertErr } = await supabase
      .from('google_credentials')
      .upsert({
        owner_id: user.id,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        expires_at: tokens.expires_at,
        calendar_id: 'primary',
        updated_at: new Date().toISOString(),
      })

    if (upsertErr) throw upsertErr

    // Redirect with success flag
    return NextResponse.redirect(`${origin}/settings/calendar?connected=true`)
  } catch (err: any) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(`${origin}/settings/calendar?error=${encodeURIComponent(err.message || 'unknown_callback_error')}`)
  }
}
