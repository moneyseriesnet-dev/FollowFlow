import { NextResponse } from 'next/server'
import { getGoogleOAuthUrl, isGoogleConfigured } from '@/lib/calendar/google-calendar-service'

export async function GET(request: Request) {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: 'Google Calendar API is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' },
        { status: 501 }
      )
    }

    const { origin } = new URL(request.url)
    const url = getGoogleOAuthUrl(origin)

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('Error generating Google OAuth URL:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate connection URL.' },
      { status: 500 }
    )
  }
}
