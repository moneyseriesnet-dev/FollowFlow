import { parseISO, differenceInDays } from 'date-fns'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * Checks if the Gemini API Key is configured.
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY
}

interface AIAnalysisResult {
  summary: string
  suggested_level_name: string
  suggested_level_reason: string
  needs_special_follow_up: boolean
  actions: string[]
  draft_message: string
}

/**
 * Computes data-driven local heuristics analysis when Gemini API is not configured or fails.
 * Fallback mechanism.
 */
function runHeuristicAnalysis(
  customer: any,
  policies: any[],
  reminders: any[],
  activities: any[],
  levels: any[]
): AIAnalysisResult {
  const todayStr = new Date().toISOString().split('T')[0]
  
  // 1. Calculate premium volumes
  let totalAnnualPremium = 0
  policies.forEach((p) => {
    if (p.policy_status !== 'active') return
    const amt = Number(p.premium_amount) || 0
    switch (p.payment_frequency) {
      case 'monthly':
        totalAnnualPremium += amt * 12
        break
      case 'quarterly':
        totalAnnualPremium += amt * 4
        break
      case 'semi_annual':
        totalAnnualPremium += amt * 2
        break
      case 'annual':
      default:
        totalAnnualPremium += amt
        break
    }
  })

  // 2. Scan reminders for payment issues
  const premiumDueReminders = reminders.filter(r => r.reminder_type === 'premium_due')
  const snoozedCount = premiumDueReminders.filter(r => r.status === 'snoozed').length
  const overdueCount = premiumDueReminders.filter(r => 
    (r.status === 'pending' || r.status === 'snoozed') && r.due_date < todayStr
  ).length

  // 3. Determine suggested level and risk flag
  const qualifiesForWatchlist = snoozedCount >= 3 || overdueCount >= 1
  const qualifiesForVip = totalAnnualPremium >= 100000

  let suggestedLevelName = 'Standard'
  let suggestedLevelReason = 'ลูกค้ามีสถานะปกติเบี้ยประกันรวมอยู่ในเกณฑ์เฉลี่ยและไม่มีประวัติการค้างชำระ'
  let needsSpecialFollowUp = false

  if (qualifiesForWatchlist) {
    suggestedLevelName = 'Watchlist'
    suggestedLevelReason = `ตรวจพบปัญหาค้างชำระเบี้ยประกัน: มีการค้างจ่ายเลยกำหนด ${overdueCount} รายการ และเลื่อนการแจ้งเตือน ${snoozedCount} ครั้ง แนะนำการติดตามเป็นพิเศษ`
    needsSpecialFollowUp = true
  } else if (qualifiesForVip) {
    suggestedLevelName = 'VIP'
    suggestedLevelReason = `ลูกค้ามียอดเบี้ยประกันรวมสูง ฿${totalAnnualPremium.toLocaleString()}/ปี ถือเป็นลูกค้ารายใหญ่ที่ควรจัดลำดับการบริการแบบ VIP`
  }

  // Fallback to match existing level names if database has lowercase or specific variants
  const bestLevelMatch = levels.find((l) => 
    l.name.toLowerCase().includes(suggestedLevelName.toLowerCase())
  )
  if (bestLevelMatch) {
    suggestedLevelName = bestLevelMatch.name
  } else if (levels.length > 0) {
    // Default to the first level in database if names don't match
    suggestedLevelName = levels[0].name
  }

  // 4. Generate summary and draft follow-up
  const companyList = Array.from(new Set(policies.map((p) => p.company))).join('/') || 'ไม่มีระบุ'
  const summary = `คุณ ${customer.full_name} เป็นลูกค้าที่มีกรมธรรม์ที่เปิดใช้บริการกับ ${companyList} รวม ${policies.length} ฉบับ มียอดเบี้ยประกันรวม ฿${totalAnnualPremium.toLocaleString()} ต่อปี โดยขณะนี้มีงานแจ้งเตือนคงค้าง ${reminders.filter(r => r.status === 'pending').length} รายการ และบันทึกกิจกรรมล่าสุดคือวันที่ ${activities[0]?.activity_date ? new Date(activities[0].activity_date).toLocaleDateString('th-TH') : 'ยังไม่มีข้อมูล'}`

  const actions = [
    `ทบทวนรายละเอียดกำหนดชำระเบี้ยประกันรอบถัดไปสำหรับกรมธรรม์ของ ${companyList}`,
  ]

  if (qualifiesForWatchlist) {
    actions.push(`ติดต่อโทรศัพท์ตรงสอบถามสาเหตุการเลื่อนชำระเบี้ยประกัน และเสนอความช่วยเหลือเคลมหรือช่องทางการจ่ายเงิน`)
    actions.push(`พิมพ์ข้อความเตือนความจำสั้นๆ ส่งทาง Line เพื่อให้ส่งเอกสารยืนยันชำระเบี้ย`)
  } else {
    actions.push(`จัดตาราง LINE ทักทายความสัมพันธ์ตามโอกาสสำคัญหรือวันเกิด`)
    if (totalAnnualPremium > 0) {
      actions.push(`เสนอแผนรีวิวการเงินครบรอบ 6 เดือน เพื่อเพิ่มพูนพอร์ตการออม`)
    }
  }

  const draftMessage = qualifiesForWatchlist
    ? `สวัสดีครับคุณ ${customer.full_name} ผมขออนุญาตเตือนกำหนดชำระเบี้ยประกันภัยที่เกินกำหนดของกรมธรรม์ครับ เพื่อการคุ้มครองที่ต่อเนื่อง หากติดขัดเรื่องการชำระเงินหรือต้องการให้ช่วยเหลือด้านประสานงานติดต่อเจ้าหน้าที่ สามารถแจ้งผมได้ตลอดเลยนะครับ ขอบคุณครับ`
    : `สวัสดีครับคุณ ${customer.full_name} สบายดีไหมครับ กรมธรรม์ของท่านยังคงให้การคุ้มครองตามปกติครับ หากมีคำถามเกี่ยวกับสิทธิประโยชน์หรือต้องการบริการด้านความคุ้มครองเพิ่มเติม สามารถทักหาผมได้ทุกเมื่อเลยนะครับ ยินดีดูแลครับ`

  return {
    summary,
    suggested_level_name: suggestedLevelName,
    suggested_level_reason: suggestedLevelReason,
    needs_special_follow_up: needsSpecialFollowUp,
    actions,
    draft_message: draftMessage
  }
}

/**
 * Main function to analyze client statistics and generate cached CRM reviews using Gemini API.
 */
export async function generateCustomerAnalysis(supabase: any, customerId: string) {
  try {
    // 1. Fetch customer profile details
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (custErr || !customer) throw new Error('Customer not found')

    // 2. Fetch related data
    const { data: policies } = await supabase.from('policies').select('*').eq('customer_id', customerId)
    const { data: reminders } = await supabase.from('reminders').select('*').eq('customer_id', customerId)
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('customer_id', customerId)
      .order('activity_date', { ascending: false })
    const { data: levels } = await supabase.from('customer_levels').select('id, name')

    const dbLevels = levels || []
    const dbPolicies = policies || []
    const dbReminders = reminders || []
    const dbActivities = activities || []

    let aiResult: AIAnalysisResult

    if (!isGeminiConfigured()) {
      // Run fallback heuristic logic
      aiResult = runHeuristicAnalysis(customer, dbPolicies, dbReminders, dbActivities, dbLevels)
    } else {
      try {
        // Run Gemini generative analysis
        // Compile context
        const context = {
          customerName: customer.full_name,
          status: customer.status,
          birthDate: customer.birth_date,
          personalNote: customer.personal_note || '—',
          policies: dbPolicies.map((p: any) => ({
            company: p.company,
            planName: p.plan_name,
            premiumAmount: p.premium_amount,
            frequency: p.payment_frequency,
            status: p.policy_status,
            dueDate: p.next_premium_due_date,
          })),
          reminders: dbReminders.map((r: any) => ({
            type: r.reminder_type,
            title: r.title,
            dueDate: r.due_date,
            status: r.status,
            priority: r.priority,
          })),
          recentActivities: dbActivities.slice(0, 5).map((a: any) => ({
            type: a.activity_type,
            date: a.activity_date,
            summary: a.summary,
            result: a.result,
          })),
          availableLevelNames: dbLevels.map((l: any) => l.name),
        }

        const promptText = `
        You are "FollowFlow Somsri AI" — an agentic insurance CRM relationship analyst helper.
        Analyze the following customer profile context:
        ${JSON.stringify(context, null, 2)}

        Tasks:
        1. Write a 2-3 sentence overview relationship summary in THAI (ai_summary).
        2. Suggest the best customer level from the "availableLevelNames" list.
           - Recommend "Watchlist" (or equivalent) if they have overdue premium payments or multiple snoozed premium due reminders.
           - Recommend "VIP" (or equivalent) if their annual premium volume (convert monthly*12, quarterly*4 etc.) is >= ฿100,000.
           - Recommend "Standard" (or equivalent) otherwise.
        3. Explain the reason for level recommendation in THAI.
        4. Recommend 2-3 specific Next Action steps in THAI.
        5. Draft a short friendly follow-up message template in THAI for the agent to review and send to Somsak.
        6. Set "needs_special_follow_up" to true if Somsak has any overdue payments.

        You MUST output a valid raw JSON object matching this schema exactly:
        {
          "summary": "Thai text summary...",
          "suggested_level_name": "Must be one exact string from the availableLevelNames list",
          "suggested_level_reason": "Thai text justification...",
          "needs_special_follow_up": true or false,
          "actions": ["Action 1 in Thai", "Action 2 in Thai", ...],
          "draft_message": "Draft message in Thai..."
        }
        Do not add markdown formatting or backticks outside the JSON. Only return the raw JSON.
        `

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2, // Low temperature for high consistency
              },
            }),
          }
        )

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Gemini API returned error: ${errText}`)
        }

        const responseData = await response.json()
        const textResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text
        
        if (!textResult) {
          throw new Error('Gemini API returned empty text parts.')
        }

        const parsed: AIAnalysisResult = JSON.parse(textResult.trim())
        aiResult = parsed
      } catch (geminiErr) {
        console.error('Gemini API failed. Falling back to rule-based heuristics:', geminiErr)
        aiResult = runHeuristicAnalysis(customer, dbPolicies, dbReminders, dbActivities, dbLevels)
      }
    }

    // 5. Map the suggested level name to its database ID
    let suggestedLevelId: string | null = null
    const matchedLevel = dbLevels.find((l: any) => 
      l.name.toLowerCase() === aiResult.suggested_level_name.toLowerCase()
    )
    if (matchedLevel) {
      suggestedLevelId = matchedLevel.id
    }

    // Combine actions list and message draft into JSON actions payload
    const actionsPayload = {
      recommendedActions: aiResult.actions,
      draftMessage: aiResult.draft_message,
    }

    // 6. Update cache columns in customers table
    const { data: updatedCustomer, error: updateErr } = await supabase
      .from('customers')
      .update({
        ai_summary: aiResult.summary,
        ai_suggested_level_id: suggestedLevelId,
        ai_suggested_level_reason: aiResult.suggested_level_reason,
        ai_suggested_actions: actionsPayload,
        needs_special_follow_up: aiResult.needs_special_follow_up,
        ai_last_generated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .select('*, customer_levels!customers_customer_level_id_fkey(*)')
      .single()

    if (updateErr) throw updateErr
    return updatedCustomer

  } catch (err: any) {
    console.error('Error in generateCustomerAnalysis:', err)
    throw err
  }
}
