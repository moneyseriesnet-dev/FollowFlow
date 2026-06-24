'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Save } from 'lucide-react'

interface CustomerLookup {
  id: string
  full_name: string
}

interface PolicyFormProps {
  policyId?: string // If present, we are editing
}

export default function PolicyForm({ policyId }: PolicyFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCustomerId = searchParams.get('customerId') || ''
  const supabase = createClient() as any

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [customers, setCustomers] = useState<CustomerLookup[]>([])

  // Form Fields
  const [customerId, setCustomerId] = useState(defaultCustomerId)
  const [company, setCompany] = useState<'AXA' | 'AIA' | 'OTHER'>('AXA')
  const [policyNumber, setPolicyNumber] = useState('')
  const [insuredName, setInsuredName] = useState('')
  const [payerName, setPayerName] = useState('')
  const [planName, setPlanName] = useState('')
  const [sumAssured, setSumAssured] = useState('')
  const [premiumAmount, setPremiumAmount] = useState('')
  const [paymentFrequency, setPaymentFrequency] = useState<'monthly' | 'quarterly' | 'semi_annual' | 'annual'>('monthly')
  const [policyStartDate, setPolicyStartDate] = useState('')
  const [nextPremiumDueDate, setNextPremiumDueDate] = useState('')
  const [policyStatus, setPolicyStatus] = useState<'active' | 'lapsed' | 'cancelled' | 'matured' | 'pending'>('active')
  const [policyNote, setPolicyNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Load customers for dropdown lookup
        const { data: custsData, error: custsErr } = await supabase
          .from('customers')
          .select('id, full_name')
          .order('full_name')

        if (custsErr) throw custsErr
        setCustomers(custsData || [])

        // If creating and no customer is pre-selected, default to the first one in the list
        if (!policyId && !customerId && custsData && custsData.length > 0) {
          setCustomerId(custsData[0].id)
        }

        // 2. Load policy details if editing
        if (policyId) {
          const { data: policy, error: policyErr } = await supabase
            .from('policies')
            .select('*')
            .eq('id', policyId)
            .single()

          if (policyErr) throw policyErr

          if (policy) {
            setCustomerId(policy.customer_id)
            setCompany(policy.company)
            setPolicyNumber(policy.policy_number)
            setInsuredName(policy.insured_name || '')
            setPayerName(policy.payer_name || '')
            setPlanName(policy.plan_name || '')
            setSumAssured(policy.sum_assured ? String(policy.sum_assured) : '')
            setPremiumAmount(policy.premium_amount ? String(policy.premium_amount) : '')
            setPaymentFrequency(policy.payment_frequency)
            setPolicyStartDate(policy.policy_start_date || '')
            setNextPremiumDueDate(policy.next_premium_due_date || '')
            setPolicyStatus(policy.policy_status)
            setPolicyNote(policy.policy_note || '')
          }
        }
      } catch (err: any) {
        console.error('Error loading policy form data:', err)
        setError(err.message || 'Failed to load form details.')
      } finally {
        setFetching(false)
      }
    }

    loadData()
  }, [policyId, defaultCustomerId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId || !policyNumber.trim()) {
      setError('Please select a customer and provide a policy number.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        owner_id: user.id,
        customer_id: customerId,
        company,
        policy_number: policyNumber.trim(),
        insured_name: insuredName.trim() || null,
        payer_name: payerName.trim() || null,
        plan_name: planName.trim() || null,
        sum_assured: sumAssured ? Number(sumAssured) : null,
        premium_amount: premiumAmount ? Number(premiumAmount) : null,
        payment_frequency: paymentFrequency,
        policy_start_date: policyStartDate || null,
        next_premium_due_date: nextPremiumDueDate || null,
        policy_status: policyStatus,
        policy_note: policyNote.trim() || null,
      }

      if (policyId) {
        const { error: updateErr } = await supabase
          .from('policies')
          .update(payload)
          .eq('id', policyId)

        if (updateErr) throw updateErr
        router.push(`/policies/${policyId}`)
      } else {
        const { error: insertErr } = await supabase
          .from('policies')
          .insert(payload)

        if (insertErr) throw insertErr
        router.push(`/customers/${customerId}`)
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save policy record.')
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {policyId ? 'Edit Policy' : 'Add Insurance Policy'}
        </h2>
        <div className="w-12" /> {/* Spacer */}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      {customers.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500 mb-4">You need to add a customer first before writing a policy.</p>
          <button
            onClick={() => router.push('/customers/new')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            Create Customer
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Customer Name (ลูกค้าผู้ถือครอง) <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Insurance Company (บริษัทประกัน) <span className="text-red-500">*</span>
              </label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="AXA">AXA</option>
                <option value="AIA">AIA</option>
                <option value="OTHER">Other (อื่นๆ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Policy Number (เลขกรมธรรม์) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                placeholder="e.g. AXA-874291"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Plan Name (แบบประกันภัย)
              </label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. iShield / Health Happy"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Insured Name (ผู้เอาประกันภัย)
              </label>
              <input
                type="text"
                value={insuredName}
                onChange={(e) => setInsuredName(e.target.value)}
                placeholder="e.g. สมชาย รักดี"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Payer Name (ผู้ชำระเบี้ยประกัน)
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="e.g. สมชาย รักดี"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Sum Assured (ทุนประกันภัย)
              </label>
              <input
                type="number"
                value={sumAssured}
                onChange={(e) => setSumAssured(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Premium Amount (เบี้ยประกันภัย)
              </label>
              <input
                type="number"
                value={premiumAmount}
                onChange={(e) => setPremiumAmount(e.target.value)}
                placeholder="e.g. 24000"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Payment Frequency (งวดชำระ)
              </label>
              <select
                value={paymentFrequency}
                onChange={(e) => setPaymentFrequency(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="monthly">Monthly (รายเดือน)</option>
                <option value="quarterly">Quarterly (ราย 3 เดือน)</option>
                <option value="semi_annual">Semi-Annual (ราย 6 เดือน)</option>
                <option value="annual">Annual (รายปี)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Policy Status (สถานะกรมธรรม์)
              </label>
              <select
                value={policyStatus}
                onChange={(e) => setPolicyStatus(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="active">Active (มีผลบังคับ)</option>
                <option value="pending">Pending (อยู่ระหว่างอนุมัติ)</option>
                <option value="lapsed">Lapsed (ขาดผลบังคับ)</option>
                <option value="cancelled">Cancelled (ยกเลิก)</option>
                <option value="matured">Matured (ครบกำหนดสัญญา)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Start Date (วันเริ่มสัญญา)
              </label>
              <input
                type="date"
                value={policyStartDate}
                onChange={(e) => setPolicyStartDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Next Due Date (วันดิวครั้งถัดไป)
              </label>
              <input
                type="date"
                value={nextPremiumDueDate}
                onChange={(e) => setNextPremiumDueDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Policy Notes (บันทึกกรมธรรม์)
              </label>
              <textarea
                value={policyNote}
                onChange={(e) => setPolicyNote(e.target.value)}
                placeholder="Important policy observations, rider details or modifications..."
                rows={3}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 h-12 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/10 cursor-pointer transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                {policyId ? 'Save Changes' : 'Create Policy'}
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
