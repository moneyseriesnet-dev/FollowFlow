import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateCustomerAnalysis } from '@/lib/ai/ai-service'

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing customerId in request payload.' },
        { status: 400 }
      )
    }

    // Generate AI analysis
    const updatedCustomer = await generateCustomerAnalysis(supabase, customerId)

    return NextResponse.json({
      success: true,
      customer: updatedCustomer
    })
  } catch (err: any) {
    console.error('Error in AI analysis route handler:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error during AI analysis.' },
      { status: 500 }
    )
  }
}
