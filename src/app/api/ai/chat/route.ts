import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isGeminiConfigured } from '@/lib/ai/ai-service'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { customerId, message, history = [] } = body

    if (!customerId || !message) {
      return NextResponse.json(
        { error: 'Missing customerId or message in request payload.' },
        { status: 400 }
      )
    }

    // 1. Fetch customer details and related records
    const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single()
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { data: policies } = await supabase.from('policies').select('*').eq('customer_id', customerId)
    const { data: reminders } = await supabase.from('reminders').select('*').eq('customer_id', customerId)
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('customer_id', customerId)
      .order('activity_date', { ascending: false })

    const dbPolicies = policies || []
    const dbReminders = reminders || []
    const dbActivities = activities || []

    // 2. Fallback check for Gemini API key
    if (!isGeminiConfigured()) {
      return NextResponse.json({
        reply: `สวัสดีครับ! ขออภัยด้วยครับ ขณะนี้ระบบไม่ได้ตั้งค่าการเชื่อมต่อกุญแจ API ของ Gemini ไว้ (กรุณาเพิ่ม \`GEMINI_API_KEY\` ในไฟล์ \`.env\`) อย่างไรก็ตาม จากข้อมูลของลูกค้ารายนี้ มีกรมธรรม์ทั้งหมด ${dbPolicies.length} ฉบับ มีงานเตือนความจำ ${dbReminders.length} รายการ และประวัติกิจกรรม ${dbActivities.length} รายการครับ`
      })
    }

    // 3. Prepare Gemini request payload
    const systemPrompt = `You are "FollowFlow Somsri AI" — an agentic insurance CRM relationship analyst helper.
You are helping the agent (user) query information about their customer "${customer.full_name}".
Here is the complete customer context data from the database:

- Customer Profile:
  Name: ${customer.full_name}
  Phone: ${customer.phone || '—'}
  Email: ${customer.email || '—'}
  LINE ID: ${customer.line_id || '—'}
  Birth Date: ${customer.birth_date || '—'}
  Address: ${customer.address || '—'}
  Personal Notes: ${customer.personal_note || '—'}

- Insurance Policies (${dbPolicies.length} policies):
  ${JSON.stringify(dbPolicies.map((p: any) => ({
    company: p.company,
    planName: p.plan_name,
    policyNumber: p.policy_number,
    premiumAmount: p.premium_amount,
    paymentFrequency: p.payment_frequency,
    policyStatus: p.policy_status,
    nextPremiumDueDate: p.next_premium_due_date,
    effectiveDate: p.effective_date
  })), null, 2)}

- Reminders & Follow-Ups (${dbReminders.length} items):
  ${JSON.stringify(dbReminders.map((r: any) => ({
    type: r.reminder_type,
    title: r.title,
    dueDate: r.due_date,
    status: r.status,
    priority: r.priority
  })), null, 2)}

- Activity History Logs (${dbActivities.length} logs):
  ${JSON.stringify(dbActivities.map((a: any) => ({
    type: a.activity_type,
    date: a.activity_date,
    summary: a.summary,
    result: a.result,
    statusAfter: a.status_after_activity
  })), null, 2)}

Instructions:
1. Answer the user's question accurately in THAI based strictly on the provided customer context data.
2. Be helpful, professional, friendly, and act as a CRM helper.
3. If the user asks about activities (ประวัติกิจกรรม), check dates/logs and summarize clearly.
4. Keep the answer structured, concise, and easy to read using markdown bullet points or bold text where appropriate.
5. If the user asks something outside the scope of the customer's data, politely redirect them to focus on the customer.
6. Provide a concise answer suitable for display in a sidebar/column chat box.
`

    // Compile Gemini contents array (including history if present)
    const contents = []
    
    // Map history to Gemini format (role must be 'user' or 'model')
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'model') {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.text }]
        })
      }
    }

    // Add the current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API returned error: ${errText}`)
    }

    const responseData = await response.json()
    const reply = responseData.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถรับข้อมูลวิเคราะห์จาก AI ได้ในขณะนี้'

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('Error in AI chat route:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error during chat.' },
      { status: 500 }
    )
  }
}
