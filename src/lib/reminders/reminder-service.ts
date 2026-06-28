import { differenceInDays, addMonths, format, parseISO, addDays, subDays, isBefore, startOfDay } from 'date-fns'

// Helper to format date as YYYY-MM-DD
const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')

/**
 * Generate Birthday Reminders for a customer.
 * Triggers 30 days before their birthday.
 *
 * @returns `true` if a new reminder was inserted, `false` otherwise.
 */
export async function generateBirthdayReminders(supabase: any, customerId: string): Promise<boolean> {
  // Fetch customer details
  const { data: customer, error } = await supabase
    .from('customers')
    .select('owner_id, birth_date, full_name')
    .eq('id', customerId)
    .single()

  if (error || !customer || !customer.birth_date) return false

  const birthDate = parseISO(customer.birth_date)
  const today = new Date()
  
  // Calculate next birthday occurrence
  let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate())
  }

  const offset = 30 // Days before birthday
  const dueDateStr = formatDate(subDays(nextBirthday, offset))

  // Prevent duplicates: check if a pending/snoozed birthday reminder already exists
  // for this exact upcoming birthday cycle (any status other than 'done').
  const { data: existing } = await supabase
    .from('reminders')
    .select('id')
    .eq('customer_id', customerId)
    .eq('reminder_type', 'birthday')
    .eq('due_date', dueDateStr)
    .neq('status', 'done')
    .limit(1)

  if (existing && existing.length > 0) return false

  await supabase.from('reminders').insert({
    owner_id: customer.owner_id,
    customer_id: customerId,
    reminder_type: 'birthday',
    title: `วันเกิดคุณ ${customer.full_name}`,
    description: `วันเกิดคุณ ${customer.full_name} วันที่ ${customer.birth_date} (อายุครบรอบปีนี้)`,
    due_date: dueDateStr,
    reminder_offset_days: offset,
    status: 'pending',
    priority: 'normal',
  })
  return true
}

/**
 * Generate Financial Review Reminders.
 * Creates a review task scheduled for 6 months after the last contact/creation date.
 * If the calculated review date is already in the past (e.g. from imported historical data),
 * the reminder is scheduled 6 months from today instead — never in the past.
 *
 * @returns `true` if a new reminder was inserted, `false` otherwise.
 */
export async function generateFinancialReviewReminders(supabase: any, customerId: string): Promise<boolean> {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('owner_id, full_name, created_at')
    .eq('id', customerId)
    .single()

  if (error || !customer) return false

  const today = startOfDay(new Date())
  const baseDate = customer.created_at ? parseISO(customer.created_at) : today
  let reviewDueDate = addMonths(baseDate, 6)

  // FUTURE-ONLY POLICY: If the review date falls in the past (e.g. from imported
  // historical data), reschedule it to 6 months from today instead.
  if (isBefore(reviewDueDate, today)) {
    reviewDueDate = addMonths(today, 6)
  }

  const dueDateStr = formatDate(reviewDueDate)

  // Prevent duplicates: check for any existing financial_review reminder for this customer
  // that is not yet done (regardless of exact due_date — only one review per customer at a time).
  const { data: existing } = await supabase
    .from('reminders')
    .select('id')
    .eq('customer_id', customerId)
    .eq('reminder_type', 'financial_review')
    .neq('status', 'done')
    .limit(1)

  if (existing && existing.length > 0) return false

  await supabase.from('reminders').insert({
    owner_id: customer.owner_id,
    customer_id: customerId,
    reminder_type: 'financial_review',
    title: `รีวิวการเงินคุณ ${customer.full_name} (ครบรอบ 6 เดือน)`,
    description: `ถึงกำหนดทบทวนแผนการเงินและกรมธรรม์ประจำรอบ 6 เดือนกับคุณ ${customer.full_name}`,
    due_date: dueDateStr,
    status: 'pending',
    priority: 'normal',
  })
  return true
}

/**
 * Generate Premium Due Reminders for a policy.
 * Generates ONE reminder at the most appropriate upcoming offset (30, 14, 7, or 3 days before due).
 *
 * FUTURE-ONLY POLICY: If next_premium_due_date is already past (e.g. imported historical data),
 * no reminder is created. The cycle will be rolled over by the user completing the overdue task.
 *
 * @returns `true` if any new reminder was inserted, `false` otherwise.
 */
export async function generatePremiumReminders(supabase: any, policyId: string): Promise<boolean> {
  const { data: policy, error } = await supabase
    .from('policies')
    .select('*, customers(full_name)')
    .eq('id', policyId)
    .single()

  if (error || !policy || !policy.next_premium_due_date) return false

  const dueDate = parseISO(policy.next_premium_due_date)
  const today = startOfDay(new Date())

  // FUTURE-ONLY POLICY: Skip entirely if the due date itself is in the past.
  // This prevents creating "already overdue" reminders from imported historical data.
  if (isBefore(dueDate, today)) return false

  // Only create ONE reminder per policy cycle — the closest upcoming offset.
  // Find the most urgent offset where the reminder date is still today or in the future.
  const offsets = [3, 7, 14, 30] // Check from most urgent to least urgent
  const nextOffset = offsets.find(offset => !isBefore(subDays(dueDate, offset), today))

  // If all offsets are in the past (due very soon), skip — dueDate is still future but within 3 days.
  // In that case use offset 3 (the smallest) so we still get a high-priority reminder.
  const effectiveOffset = nextOffset ?? 3

  const reminderDate = subDays(dueDate, effectiveOffset)
  // FUTURE-ONLY POLICY: The computed reminder date must not be in the past.
  if (isBefore(reminderDate, today)) return false

  const dueDateStr = formatDate(reminderDate)

  // Prevent duplicates: check for any non-done premium reminder for this exact policy cycle.
  const { data: existing } = await supabase
    .from('reminders')
    .select('id')
    .eq('policy_id', policyId)
    .eq('reminder_type', 'premium_due')
    .neq('status', 'done')
    .limit(1)

  if (existing && existing.length > 0) return false

  const companyLabel = policy.company === 'AXA' ? 'AXA' : policy.company === 'AIA' ? 'AIA' : 'OTHER'
  const clientName = policy.customers?.full_name || 'ลูกค้า'

  await supabase.from('reminders').insert({
    owner_id: policy.owner_id,
    customer_id: policy.customer_id,
    policy_id: policyId,
    reminder_type: 'premium_due',
    title: `ชำระเบี้ย ${companyLabel} (${clientName})`,
    description: `ครบกำหนดชำระเบี้ยประกันแผน ${policy.plan_name || '—'} เลขกรมธรรม์ ${policy.policy_number} จำนวน ฿${policy.premium_amount?.toLocaleString() || '0'} ในวันที่ ${policy.next_premium_due_date}`,
    due_date: dueDateStr,
    reminder_offset_days: effectiveOffset,
    status: 'pending',
    priority: effectiveOffset <= 7 ? 'high' : 'normal',
  })
  return true
}

/**
 * Scan all active customers and policies for an owner, generating any missing reminders.
 * Self-healing mechanism — runs in the background after Dashboard initial load.
 *
 * @returns `true` if any new reminder was created (signals Dashboard to refetch), `false` otherwise.
 */
export async function scanAndGenerateAllReminders(supabase: any, ownerId: string): Promise<boolean> {
  let hasNewReminders = false

  // Fetch customers and policies concurrently — they are independent of each other.
  const [customersResult, policiesResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, birth_date')
      .eq('owner_id', ownerId)
      .eq('status', 'active'),
    supabase
      .from('policies')
      .select('id, next_premium_due_date')
      .eq('owner_id', ownerId)
      .eq('policy_status', 'active'),
  ])

  const customers = customersResult.data ?? []
  const policies = policiesResult.data ?? []

  // 1. Process customers sequentially to avoid race-condition duplicates.
  //    (concurrent inserts with the same duplicate-check logic can still cause dupes)
  for (const cust of customers) {
    if (cust.birth_date) {
      const r = await generateBirthdayReminders(supabase, cust.id)
      if (r) hasNewReminders = true
    }
    const r2 = await generateFinancialReviewReminders(supabase, cust.id)
    if (r2) hasNewReminders = true
  }

  // 2. Process policies sequentially for the same reason.
  for (const pol of policies) {
    if (!pol.next_premium_due_date) continue
    const r = await generatePremiumReminders(supabase, pol.id)
    if (r) hasNewReminders = true
  }

  return hasNewReminders
}

/**
 * Rollover Policy Premium Cycle.
 * Shifts due dates forward according to payment frequency, and creates next cycle tasks.
 */
export async function rolloverPolicyCycle(supabase: any, policyId: string, reminderId: string) {
  // 1. Mark all pending premium reminders for this policy as done to avoid leftovers
  await supabase
    .from('reminders')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('policy_id', policyId)
    .eq('reminder_type', 'premium_due')
    .eq('status', 'pending')

  // 2. Fetch policy details
  const { data: policy } = await supabase
    .from('policies')
    .select('next_premium_due_date, payment_frequency')
    .eq('id', policyId)
    .single()

  if (!policy || !policy.next_premium_due_date) return

  const currentDueDate = parseISO(policy.next_premium_due_date)
  let monthsToAdd = 1

  switch (policy.payment_frequency) {
    case 'quarterly':
      monthsToAdd = 3
      break
    case 'semi_annual':
      monthsToAdd = 6
      break
    case 'annual':
      monthsToAdd = 12
      break
    case 'monthly':
    default:
      monthsToAdd = 1
      break
  }

  const nextDueDate = addMonths(currentDueDate, monthsToAdd)
  const nextDueDateStr = formatDate(nextDueDate)

  // 3. Update policy with new premium due date
  await supabase
    .from('policies')
    .update({ next_premium_due_date: nextDueDateStr })
    .eq('id', policyId)

  // 4. Generate next cycle's premium reminders
  await generatePremiumReminders(supabase, policyId)
}

/**
 * Complete a Premium Due Reminder, recording the payment amount in activities log, and roll over the policy cycle.
 */
export async function completePremiumReminderWithPayment(
  supabase: any,
  params: {
    policyId: string
    reminderId: string
    customerId: string
    amountPaid: number
    paymentDate?: string // defaults to now
  }
) {
  const { policyId, reminderId, customerId, amountPaid, paymentDate } = params
  const resolvedDate = paymentDate || new Date().toISOString()

  // 1. Mark all pending premium reminders for this policy as done to avoid leftovers
  const { error: updateRemErr } = await supabase
    .from('reminders')
    .update({ status: 'done', completed_at: resolvedDate })
    .eq('policy_id', policyId)
    .eq('reminder_type', 'premium_due')
    .eq('status', 'pending')

  if (updateRemErr) throw updateRemErr

  // 2. Fetch policy details
  const { data: policy, error: policyErr } = await supabase
    .from('policies')
    .select('policy_number, plan_name, company, next_premium_due_date, payment_frequency, owner_id')
    .eq('id', policyId)
    .single()

  if (policyErr) throw policyErr
  if (!policy) return

  // 3. Log the payment activity in the activities table
  const companyLabel = policy.company === 'AXA' ? 'AXA' : policy.company === 'AIA' ? 'AIA' : 'OTHER'
  const summaryText = `รับชำระเบี้ยประกันภัย (${companyLabel})`
  const resultText = `เก็บเบี้ยประกันภัยแผน ${policy.plan_name || '—'} เลขกรมธรรม์ ${policy.policy_number} จำนวน ฿${amountPaid.toLocaleString()} เรียบร้อยแล้ว`

  const { error: actErr } = await supabase
    .from('activities')
    .insert({
      owner_id: policy.owner_id,
      customer_id: customerId,
      policy_id: policyId,
      reminder_id: reminderId,
      activity_type: 'premium_payment',
      activity_date: resolvedDate,
      summary: summaryText,
      result: resultText,
      amount_paid: amountPaid,
      status_after_activity: 'Paid',
    })

  if (actErr) throw actErr

  // 4. Calculate next due date
  const currentDueDate = policy.next_premium_due_date ? parseISO(policy.next_premium_due_date) : new Date()
  let monthsToAdd = 1

  switch (policy.payment_frequency) {
    case 'quarterly':
      monthsToAdd = 3
      break
    case 'semi_annual':
      monthsToAdd = 6
      break
    case 'annual':
      monthsToAdd = 12
      break
    case 'monthly':
    default:
      monthsToAdd = 1
      break
  }

  const nextDueDate = addMonths(currentDueDate, monthsToAdd)
  const nextDueDateStr = formatDate(nextDueDate)

  // 5. Update policy with new premium due date
  const { error: updatePolicyErr } = await supabase
    .from('policies')
    .update({ next_premium_due_date: nextDueDateStr })
    .eq('id', policyId)

  if (updatePolicyErr) throw updatePolicyErr

  // 6. Generate next cycle's premium reminders
  await generatePremiumReminders(supabase, policyId)
}
