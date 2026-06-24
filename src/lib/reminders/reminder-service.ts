import { differenceInDays, addMonths, format, parseISO, addDays, subDays } from 'date-fns'

// Helper to format date as YYYY-MM-DD
const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')

/**
 * Generate Birthday Reminders for a customer.
 * Triggers 30 days and 1 day before their birthday.
 */
export async function generateBirthdayReminders(supabase: any, customerId: string) {
  // Fetch customer details
  const { data: customer, error } = await supabase
    .from('customers')
    .select('owner_id, birth_date, full_name')
    .eq('id', customerId)
    .single()

  if (error || !customer || !customer.birth_date) return

  const birthDate = parseISO(customer.birth_date)
  const today = new Date()
  
  // Calculate next birthday occurrence
  let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate())
  }

  const offsets = [30, 1] // Days before birthday

  for (const offset of offsets) {
    const reminderDueDate = subDays(nextBirthday, offset)
    const dueDateStr = formatDate(reminderDueDate)

    // Check if this birthday reminder already exists to avoid duplicates
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('customer_id', customerId)
      .eq('reminder_type', 'birthday')
      .eq('due_date', dueDateStr)
      .maybeSingle()

    if (!existing) {
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
    }
  }
}

/**
 * Generate Financial Review Reminders.
 * Creates a review task scheduled for 6 months after the last contact/creation date.
 */
export async function generateFinancialReviewReminders(supabase: any, customerId: string) {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('owner_id, full_name, created_at')
    .eq('id', customerId)
    .single()

  if (error || !customer) return

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
    .maybeSingle()

  if (!existing) {
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
  }
}

/**
 * Generate Premium Due Reminders for a policy.
 * Generates 5 reminders (30, 14, 7, 3, 1 day before due date) for the active cycle.
 */
export async function generatePremiumReminders(supabase: any, policyId: string) {
  const { data: policy, error } = await supabase
    .from('policies')
    .select('*, customers(full_name)')
    .eq('id', policyId)
    .single()

  if (error || !policy || !policy.next_premium_due_date) return

  const dueDate = parseISO(policy.next_premium_due_date)
  const offsets = [30, 14, 7, 3, 1] // Days before next premium due date

  for (const offset of offsets) {
    const reminderDueDate = subDays(dueDate, offset)
    const dueDateStr = formatDate(reminderDueDate)

    // Check if this specific reminder offset already exists for this cycle
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('policy_id', policyId)
      .eq('reminder_type', 'premium_due')
      .eq('due_date', dueDateStr)
      .maybeSingle()

    if (!existing) {
      const companyLabel = policy.company === 'AXA' ? 'AXA' : policy.company === 'AIA' ? 'AIA' : 'OTHER'
      const clientName = policy.customers?.full_name || 'ลูกค้า'

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
    }
  }
}

/**
 * Scan all active customers and policies for an owner, generating any missing reminders.
 * Self-healing mechanism.
 */
export async function scanAndGenerateAllReminders(supabase: any, ownerId: string) {
  // 1. Scan customers for birthday & financial reviews
  const { data: customers } = await supabase
    .from('customers')
    .select('id, birth_date')
    .eq('owner_id', ownerId)
    .eq('status', 'active')

  if (customers) {
    for (const cust of customers) {
      if (cust.birth_date) {
        await generateBirthdayReminders(supabase, cust.id)
      }
      await generateFinancialReviewReminders(supabase, cust.id)
    }
  }

  // 2. Scan policies for premium dues
  const { data: policies } = await supabase
    .from('policies')
    .select('id, next_premium_due_date')
    .eq('owner_id', ownerId)
    .eq('policy_status', 'active')

  if (policies) {
    for (const pol of policies) {
      if (pol.next_premium_due_date) {
        await generatePremiumReminders(supabase, pol.id)
      }
    }
  }
}

/**
 * Rollover Policy Premium Cycle.
 * Shifty due dates forward according to payment frequency, and creates next cycle tasks.
 */
export async function rolloverPolicyCycle(supabase: any, policyId: string, reminderId: string) {
  // 1. Mark specific reminder as done
  await supabase
    .from('reminders')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', reminderId)

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
