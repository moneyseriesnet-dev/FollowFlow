import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidCredentials } from '@/lib/calendar/google-calendar-service'

export async function POST() {
  try {
    const supabase = (await createClient()) as any
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get valid credentials (will auto-refresh access token if needed)
    const creds = await getValidCredentials(supabase, user.id)
    if (!creds) {
      return NextResponse.json({ error: 'No Google Calendar credentials found' }, { status: 404 })
    }

    // Fetch userinfo from Google
    const userinfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    })

    if (!userinfoRes.ok) {
      const errText = await userinfoRes.text()
      return NextResponse.json({ error: `Failed to fetch Google userinfo: ${errText}` }, { status: userinfoRes.status })
    }

    const userinfo = await userinfoRes.json()
    const email = userinfo.email

    if (email) {
      // Update the DB
      const { error: updateErr } = await supabase
        .from('google_credentials')
        .update({ google_email: email, updated_at: new Date().toISOString() })
        .eq('owner_id', user.id)

      if (updateErr) throw updateErr

      return NextResponse.json({ email })
    }

    return NextResponse.json({ error: 'No email found in userinfo' }, { status: 400 })
  } catch (err: any) {
    console.error('Error in sync-email API:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
