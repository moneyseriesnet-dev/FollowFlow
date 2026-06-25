import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncReminderToGoogleCalendar, syncBatchReminders } from '@/lib/calendar/google-calendar-service'

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { reminderId, batch } = body

    if (batch) {
      // Run batch sync for the user
      const result = await syncBatchReminders(supabase, user.id)
      return NextResponse.json({
        success: true,
        batch: true,
        syncedCount: result.syncedCount
      })
    }

    if (!reminderId) {
      return NextResponse.json(
        { error: 'Missing reminderId or batch flag in payload.' },
        { status: 400 }
      )
    }

    // Sync a single reminder
    const result = await syncReminderToGoogleCalendar(supabase, reminderId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: `Sync failed: ${result.reason || 'unknown'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, reason: result.reason })
  } catch (err: any) {
    console.error('Error in sync API handler:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error during calendar sync.' },
      { status: 500 }
    )
  }
}
