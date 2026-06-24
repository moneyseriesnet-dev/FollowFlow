import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approveAndImportRows } from '@/lib/import/import-service'
import { DraftRow } from '@/lib/ocr/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request JSON body
    const body = await request.json()
    const { batchId, approvedRows } = body as {
      batchId: string
      approvedRows: DraftRow[]
    }

    if (!batchId || !approvedRows) {
      return NextResponse.json({ error: 'Missing batch ID or approved rows' }, { status: 400 })
    }

    // 3. Approve and Import rows
    const results = await approveAndImportRows(supabase, user.id, batchId, approvedRows)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error: any) {
    console.error('Approve route error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
