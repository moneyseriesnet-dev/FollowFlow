import { differenceInDays, addMonths, format, parseISO, addDays, subDays } from 'date-fns'

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

  const offsets = [30] // Days before birthday (ยกเลิกแจ้งล่วงหน้า 1 วัน)

  // Compute all due dates we need to check upfront
  const dueDates = offsets.map((offset) => formatDate(subDays(nextBirthday, offset)))

  // Batch duplicate check: fetch all existing birthday reminders for this
  // customer at once instead of one query per offset.
  const { data: existing } = await supabase
    .from('reminders')
    .select('due_date')
    .eq('customer_id', customerId)
    .eq('reminder_type', 'birthday')
    .in('due_date', dueDates)

  const existingDates = new Set((existing ?? []).map((r: any) => r.due_date))

  let inserted = false
  for (const offset of offsets) {
    const dueDateStr = formatDate(subDays(nextBirthday, offset))
    if (!existingDates.has(dueDateStr)) {
      await supabase.from('reminders').insert({
        owner_id: customer.owner_id,
        customer_id: customerId,
        reminder_type: 'birthday',
        title: `วันเกิดคุณ ${customer.full_name} (ล่วงหน้า ${offset} วัน)`,
        description: `วันเกิดคุณ ${customer.full_name} วันที่ ${customer.birth_date} (อายุครบรอบปีนี้)`,
        due_date: dueDateStr,
        reminder_offset_days: offset,
        status: 'pending',
        priority: offset === 1 ? 'high' : 'normal',
      })
      inserted = true
    }
  }
  return inserted
}

/**
 * Generate Financial Review Reminders.
 * Creates a review task scheduled for 6 months after the last contact/creation date.
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

  const baseDate = customer.created_at ? parseISO(customer.created_at) : new Date()
  const reviewDueDate = addMonths(baseDate, 6)
  const dueDateStr = formatDate(reviewDueDate)

  // Avoid duplicate review reminders for the same target date
  const { data: existing } = await supabase
    .from('reminders')
    .select('id')
    .eq('customer_id', customerId)
    .eq('reminder_type', 'financial_review')
    .eq('due_date', dueDateStr)
    .limit(1)

  if (!existing || existing.length === 0) {
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
  return false
}

/**
 * Generate Premium Due Reminders for a policy.
 * Generates reminders 30, 14, 7, 3 days before the due date for the active cycle.
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
  const offsets = [30, 14, 7, 3] // Days before next premium due date (ยกเลิกแจ้งล่วงหน้า 1 วัน)

  // Compute all due dates we need to check upfront
  const dueDates = offsets.map((offset) => formatDate(subDays(dueDate, offset)))

  // Batch duplicate check: one query for all offsets instead of N queries.
  const { data: existing } = await supabase
    .from('reminders')
    .select('due_date')
    .eq('policy_id', policyId)
    .eq('reminder_type', 'premium_due')
    .in('due_date', dueDates)

  const existingDates = new Set((existing ?? []).map((r: any) => r.due_date))

  const companyLabel = policy.company === 'AXA' ? 'AXA' : policy.company === 'AIA' ? 'AIA' : 'OTHER'
  const clientName = policy.customers?.full_name || 'ลูกค้า'

  let inserted = false
  for (const offset of offsets) {
    const dueDateStr = formatDate(subDays(dueDate, offset))
    if (!existingDates.has(dueDateStr)) {
      await supabase.from('reminders').insert({
        owner_id: policy.owner_id,
        customer_id: policy.customer_id,
        policy_id: policyId,
        reminder_type: 'premium_due',
        title: `ชำระเบี้ย ${companyLabel} (${clientName}) - ล่วงหน้า ${offset} วัน`,
        description: `ครบกำหนดชำระเบี้ยประกันแผน ${policy.plan_name || '—'} เลขกรมธรรม์ ${policy.policy_number} จำนวน ฿${policy.premium_amount?.toLocaleString() || '0'} ในวันที่ ${policy.next_premium_due_date}`,
        due_date: dueDateStr,
        reminder_offset_days: offset,
        status: 'pending',
        priority: offset <= 3 ? 'high' : 'normal',
      })
      inserted = true
    }
  }
  return inserted
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

  // 1. Process customers for birthday & financial reviews
  //    Use Promise.all to process all customers concurrently instead of sequentially.
  if (customers.length > 0) {
    const customerResults = await Promise.all(
      customers.map(async (cust: any) => {
        const results = await Promise.all([
          cust.birth_date ? generateBirthdayReminders(supabase, cust.id) : Promise.resolve(false),
          generateFinancialReviewReminders(supabase, cust.id),
        ])
        return results.some(Boolean)
      })
    )
    if (customerResults.some(Boolean)) hasNewReminders = true
  }

  // 2. Process policies for premium dues concurrently.
  if (policies.length > 0) {
    const policyResults = await Promise.all(
      policies
        .filter((pol: any) => pol.next_premium_due_date)
        .map((pol: any) => generatePremiumReminders(supabase, pol.id))
    )
    if (policyResults.some(Boolean)) hasNewReminders = true
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
