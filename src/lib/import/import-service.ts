import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { DraftRow, OcrExtractedRow } from '../ocr/types'

type DB = Database

export async function createImportBatch(
  supabase: any,
  ownerId: string,
  sourceCompany: 'AXA' | 'AIA',
  totalImages: number
) {
  const { data, error } = await supabase
    .from('import_batches')
    .insert({
      owner_id: ownerId,
      source_company: sourceCompany,
      status: 'processing',
      total_images: totalImages,
      total_rows_detected: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveImportImages(
  supabase: any,
  ownerId: string,
  batchId: string,
  imageUrls: string[],
  sourceCompany: 'AXA' | 'AIA'
) {
  const payload = imageUrls.map((url) => ({
    owner_id: ownerId,
    import_batch_id: batchId,
    image_url: url,
    source_company: sourceCompany,
    ocr_status: 'completed' as const,
  }))

  const { data, error } = await supabase
    .from('import_images')
    .insert(payload)
    .select()

  if (error) throw error
  return data
}

export async function saveDraftRows(
  supabase: any,
  ownerId: string,
  batchId: string,
  rows: OcrExtractedRow[],
  imageId: string | null
) {
  const payload = rows.map((row) => ({
    owner_id: ownerId,
    import_batch_id: batchId,
    import_image_id: imageId,
    raw_ocr_text: row.raw_ocr_text,
    detected_customer_name: row.detected_customer_name,
    detected_policy_number: row.detected_policy_number,
    detected_company: row.detected_company,
    detected_plan_name: row.detected_plan_name,
    detected_premium_amount: row.detected_premium_amount,
    detected_payment_frequency: row.detected_payment_frequency,
    detected_due_date: row.detected_due_date,
    detected_birth_date: row.detected_birth_date,
    confidence_score: row.confidence_score,
    review_status: 'pending' as const,
  }))

  const { data, error } = await supabase
    .from('import_draft_rows')
    .insert(payload)
    .select()

  if (error) throw error

  // Update total rows detected in batch
  const { data: countData } = await supabase
    .from('import_draft_rows')
    .select('id', { count: 'exact', head: true })
    .eq('import_batch_id', batchId)

  await supabase
    .from('import_batches')
    .update({ total_rows_detected: countData ? countData.length : rows.length })
    .eq('id', batchId)

  return data
}

export async function approveAndImportRows(
  supabase: any,
  ownerId: string,
  batchId: string,
  approvedRows: DraftRow[]
) {
  let customersCreated = 0
  let customersMatched = 0
  let policiesCreated = 0
  let policiesUpdated = 0

  for (const row of approvedRows) {
    if (!row.detected_customer_name || !row.detected_policy_number) continue

    // Normalize customer name (trim, collapse multiple spaces to a single space)
    const normalizedName = row.detected_customer_name.trim().replace(/\s+/g, ' ')

    // 1. Find or create customer
    let customerId: string

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('full_name', normalizedName)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
      customersMatched++
    } else {
      const { data: newCustomer, error: cErr } = await supabase
        .from('customers')
        .insert({
          owner_id: ownerId,
          full_name: normalizedName,
          birth_date: row.detected_birth_date,
          status: 'active',
        })
        .select()
        .single()

      if (cErr) throw cErr
      customerId = newCustomer.id
      customersCreated++
    }

    // 2. Find or create/update policy
    const { data: existingPolicy } = await supabase
      .from('policies')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('policy_number', row.detected_policy_number)
      .maybeSingle()

    const policyPayload = {
      owner_id: ownerId,
      customer_id: customerId,
      company: row.detected_company || 'OTHER',
      policy_number: row.detected_policy_number,
      plan_name: row.detected_plan_name,
      premium_amount: row.detected_premium_amount,
      payment_frequency: (row.detected_payment_frequency as any) || 'monthly',
      next_premium_due_date: row.detected_due_date,
      source: 'ocr_import' as const,
      policy_status: 'active' as const,
    }

    if (existingPolicy) {
      const { error: pErr } = await supabase
        .from('policies')
        .update(policyPayload)
        .eq('id', existingPolicy.id)

      if (pErr) throw pErr
      policiesUpdated++
    } else {
      const { error: pErr } = await supabase
        .from('policies')
        .insert(policyPayload)

      if (pErr) throw pErr
      policiesCreated++
    }

    // Update the review status of the draft row to 'approved'
    await supabase
      .from('import_draft_rows')
      .update({ review_status: 'approved' })
      .eq('id', row.id)
  }

  // 3. Mark import batch as completed
  await supabase
    .from('import_batches')
    .update({ status: 'completed' })
    .eq('id', batchId)

  return {
    customersCreated,
    customersMatched,
    policiesCreated,
    policiesUpdated,
  }
}
