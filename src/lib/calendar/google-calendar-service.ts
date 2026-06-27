import { addDays, format, parseISO } from 'date-fns'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')

/**
 * Checks if the Google Calendar integration environment variables are set.
 */
export function isGoogleConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

/**
 * Returns the Google OAuth 2.0 Authorization URL.
 */
export function getGoogleOAuthUrl(origin: string): string {
  if (!isGoogleConfigured()) {
    throw new Error('Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')
  }

  const redirectUri = `${origin}/api/auth/google/callback`
  const scope = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email'
  
  return `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`
}

/**
 * Exchanges the Google authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(code: string, origin: string) {
  if (!isGoogleConfigured()) {
    throw new Error('Google OAuth credentials are not configured.')
  }

  const redirectUri = `${origin}/api/auth/google/callback`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to exchange Google OAuth code: ${errText}`)
  }

  const data = await response.json()
  
  // Calculate expiry date
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  // Fetch the user's email using the access token
  let email = null
  try {
    const userinfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    if (userinfoRes.ok) {
      const userinfo = await userinfoRes.json()
      email = userinfo.email
    } else {
      console.warn('Failed to fetch Google userinfo during token exchange:', await userinfoRes.text())
    }
  } catch (err) {
    console.error('Error fetching Google userinfo during token exchange:', err)
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token, // Only present on initial connection
    expires_at: expiresAt,
    email,
  }
}

/**
 * Refreshes the Google access token using the refresh token.
 */
export async function refreshAccessToken(refreshToken: string) {
  if (!isGoogleConfigured()) {
    throw new Error('Google OAuth credentials are not configured.')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to refresh Google access token: ${errText}`)
  }

  const data = await response.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  return {
    access_token: data.access_token,
    expires_at: expiresAt,
  }
}

/**
 * Retrieves valid Google Calendar credentials. Refreshes the access token if expired.
 */
export async function getValidCredentials(supabase: any, ownerId: string) {
  const { data: creds, error } = await supabase
    .from('google_credentials')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (error || !creds) return null

  const expiresAt = new Date(creds.expires_at)
  const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
  
  // Check if token is expired or close to expiring
  if (expiresAt.getTime() - bufferTime < Date.now()) {
    try {
      const refreshed = await refreshAccessToken(creds.refresh_token)
      
      // Update credentials in database
      const { data: updatedCreds, error: updateErr } = await supabase
        .from('google_credentials')
        .update({
          access_token: refreshed.access_token,
          expires_at: refreshed.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', ownerId)
        .select()
        .single()

      if (updateErr) throw updateErr
      return updatedCreds
    } catch (err) {
      console.error('Error refreshing Google credentials:', err)
      return null
    }
  }

  return creds
}

/**
 * Syncs a single reminder to the Google Calendar of its owner.
 */
export async function syncReminderToGoogleCalendar(supabase: any, reminderId: string): Promise<{ success: boolean; reason?: string }> {
  try {
    // 1. Fetch reminder and linked customer details
    const { data: reminder, error: remErr } = await supabase
      .from('reminders')
      .select('*, customers(id, full_name, phone, line_id)')
      .eq('id', reminderId)
      .single()

    if (remErr || !reminder) {
      return { success: false, reason: 'reminder_not_found' }
    }

    const ownerId = reminder.owner_id
    const customer = reminder.customers

    // 2. Fetch and validate Google Calendar credentials
    const creds = await getValidCredentials(supabase, ownerId)
    if (!creds) {
      // Set status to failed/unsynced since they aren't connected
      await supabase
        .from('reminders')
        .update({ google_sync_status: 'unsynced' })
        .eq('id', reminderId)
      return { success: false, reason: 'google_not_connected' }
    }

    const accessToken = creds.access_token
    const calendarId = creds.calendar_id || 'primary'

    // 3. Handle deletions: if reminder is sync disabled, cancelled or deleted
    const isSyncDisabled = !reminder.google_sync_enabled
    const isCancelled = reminder.status === 'cancelled'
    
    if (isSyncDisabled || isCancelled) {
      if (reminder.google_event_id) {
        // Delete the event on Google Calendar
        const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${reminder.google_event_id}`
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        // We ignore 404 since it means the event was already deleted
        if (!res.ok && res.status !== 404) {
          const errText = await res.text()
          console.error(`Failed to delete Google Calendar event: ${errText}`)
          await supabase
            .from('reminders')
            .update({ google_sync_status: 'failed' })
            .eq('id', reminderId)
          return { success: false, reason: 'google_delete_failed' }
        }

        // Clear local event ID
        await supabase
          .from('reminders')
          .update({
            google_event_id: null,
            google_sync_status: 'unsynced'
          })
          .eq('id', reminderId)
      }
      return { success: true, reason: isSyncDisabled ? 'sync_disabled' : 'cancelled' }
    }

    // 4. Prepare calendar event details
    const clientName = customer?.full_name || 'ลูกค้า'
    let summary = `[FollowFlow] ${reminder.title} - ${clientName}`
    if (reminder.status === 'done') {
      summary = `[เสร็จสิ้น] ${reminder.title} - ${clientName}`
    }

    // Description markup
    const descriptionLines = [
      `🔔 Reminder: ${reminder.title}`,
      reminder.description ? `📝 Details: ${reminder.description}` : '',
      `👤 Client: ${clientName}`,
      customer?.phone ? `📞 Phone: ${customer.phone}` : '',
      customer?.line_id ? `💬 Line ID: ${customer.line_id}` : '',
      `🔗 Open CRM: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/customers/${customer?.id || ''}`
    ].filter(Boolean)
    const description = descriptionLines.join('\n')

    // Dates matching all-day event
    const startDateStr = reminder.due_date
    const nextDay = addDays(parseISO(reminder.due_date), 1)
    const endDateStr = formatDate(nextDay)

    const eventPayload = {
      summary,
      description,
      start: { date: startDateStr },
      end: { date: endDateStr },
      transparency: 'transparent', // Free status so it doesn't block the user's day
      reminders: { useDefault: true },
    }

    // 5. Update or Create event
    if (reminder.google_event_id) {
      const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${reminder.google_event_id}`
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      })

      if (res.ok) {
        await supabase
          .from('reminders')
          .update({ google_sync_status: 'synced' })
          .eq('id', reminderId)
        return { success: true, reason: 'updated' }
      }

      // If the event was deleted manually in Google Calendar (404), fall back to create new
      if (res.status === 404) {
        console.warn(`Event ${reminder.google_event_id} not found in Google Calendar. Creating a new one.`)
      } else {
        const errText = await res.text()
        console.error(`Failed to update Google Calendar event: ${errText}`)
        await supabase
          .from('reminders')
          .update({ google_sync_status: 'failed' })
          .eq('id', reminderId)
        return { success: false, reason: 'google_update_failed' }
      }
    }

    // Create new event
    const createUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`Failed to create Google Calendar event: ${errText}`)
      await supabase
        .from('reminders')
        .update({ google_sync_status: 'failed' })
        .eq('id', reminderId)
      return { success: false, reason: 'google_create_failed' }
    }

    const eventData = await res.json()
    
    // Save event ID locally
    await supabase
      .from('reminders')
      .update({
        google_event_id: eventData.id,
        google_sync_status: 'synced'
      })
      .eq('id', reminderId)

    return { success: true, reason: 'created' }

  } catch (err: any) {
    console.error('Error in syncReminderToGoogleCalendar:', err)
    // Attempt to mark as failed
    try {
      await supabase
        .from('reminders')
        .update({ google_sync_status: 'failed' })
        .eq('id', reminderId)
    } catch {}
    return { success: false, reason: err.message || 'unknown_error' }
  }
}

/**
 * Syncs all unsynced or failed reminders for a user in a batch.
 */
export async function syncBatchReminders(supabase: any, ownerId: string): Promise<{ success: boolean; syncedCount: number }> {
  try {
    // 1. Fetch credentials
    const creds = await getValidCredentials(supabase, ownerId)
    if (!creds) {
      return { success: false, syncedCount: 0 }
    }

    // 2. Fetch all reminders that need to be synced
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('google_sync_enabled', true)
      .in('google_sync_status', ['unsynced', 'failed'])
      .in('status', ['pending', 'snoozed'])

    if (error || !reminders || reminders.length === 0) {
      return { success: true, syncedCount: 0 }
    }

    let syncedCount = 0
    // Perform syncs sequentially to prevent rate limits
    for (const r of reminders) {
      const res = await syncReminderToGoogleCalendar(supabase, r.id)
      if (res.success) syncedCount++
    }

    return { success: true, syncedCount }
  } catch (err) {
    console.error('Batch sync error:', err)
    return { success: false, syncedCount: 0 }
  }
}
