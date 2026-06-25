import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = (await createClient()) as any
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Delete credentials
    const { error: delErr } = await supabase
      .from('google_credentials')
      .delete()
      .eq('owner_id', user.id)

    if (delErr) throw delErr

    // 2. Clear reminders calendar sync columns
    const { error: remErr } = await supabase
      .from('reminders')
      .update({
        google_event_id: null,
        google_sync_status: 'unsynced'
      })
      .eq('owner_id', user.id)

    if (remErr) throw remErr

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error disconnecting Google Calendar:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to disconnect Google Calendar.' },
      { status: 500 }
    )
  }
}
