import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOcrService } from '@/lib/ocr/ocr-service'
import { getCsvParseService } from '@/lib/ocr/csv-service'
import { saveDraftRows } from '@/lib/import/import-service'

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
    const { batchId, images } = body as {
      batchId: string
      images: Array<{ id: string; imageUrl: string }>
    }

    if (!batchId || !images || images.length === 0) {
      return NextResponse.json({ error: 'Invalid batch or image IDs' }, { status: 400 })
    }

    // 3. Get batch to identify source company
    const { data: batch, error: batchErr } = (await supabase
      .from('import_batches')
      .select('source_company')
      .eq('id', batchId)
      .single()) as any

    if (batchErr || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const sourceCompany = (batch as any).source_company as 'AXA' | 'AIA'
    const ocrService = getOcrService()
    const csvService = getCsvParseService()
    const allDraftRows: any[] = []

    // 4. Process each file through the appropriate service
    for (const image of images) {
      const isTextFile = image.imageUrl.startsWith('data:text/plain')

      let extractedRows

      if (isTextFile) {
        // Decode the text content from the data URI
        const commaIdx = image.imageUrl.indexOf(',')
        const encodedText = image.imageUrl.substring(commaIdx + 1)
        const textContent = decodeURIComponent(encodedText)

        extractedRows = await csvService.extractFromText(textContent, sourceCompany)
      } else {
        // Image OCR path (original behavior)
        extractedRows = await ocrService.extractFromImage(image.imageUrl, sourceCompany)
      }

      // Save draft rows to database
      const savedRows = await saveDraftRows(supabase, user.id, batchId, extractedRows, image.id)

      if (savedRows) {
        allDraftRows.push(...savedRows)
      }
    }

    // Update batch status to 'reviewing'
    await supabase
      .from('import_batches')
      .update({ status: 'reviewing' })
      .eq('id', batchId)

    return NextResponse.json({
      success: true,
      draftRows: allDraftRows.map((row) => ({
        id: row.id,
        image_id: row.import_image_id,
        detected_customer_name: row.detected_customer_name,
        detected_policy_number: row.detected_policy_number,
        detected_company: row.detected_company,
        detected_plan_name: row.detected_plan_name,
        detected_premium_amount: row.detected_premium_amount ? Number(row.detected_premium_amount) : null,
        detected_payment_frequency: row.detected_payment_frequency,
        detected_due_date: row.detected_due_date,
        detected_birth_date: row.detected_birth_date,
        confidence_score: row.confidence_score ? Number(row.confidence_score) : null,
        ai_comment: row.ai_comment || null,
        review_status: row.review_status,
        isEditing: false,
      })),
    })
  } catch (error: any) {
    console.error('Process route error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
