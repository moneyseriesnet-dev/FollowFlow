'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Save } from 'lucide-react'

interface CustomerLookup {
  id: string
  full_name: string
}

export default function NewReminderPage() {
  const router = useRouter()
  const supabase = createClient() as any

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [customers, setCustomers] = useState<CustomerLookup[]>([])

  // Form Fields
  const [customerId, setCustomerId] = useState('')
  const [reminderType, setReminderType] = useState<'general' | 'follow_up' | 'premium_due' | 'birthday' | 'financial_review'>('general')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCustomers() {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, full_name')
          .order('full_name')

        if (error) throw error
        setCustomers(data || [])
        if (data && data.length > 0) {
          setCustomerId(data[0].id)
        }
      } catch (err: any) {
        console.error('Error fetching customers lookup:', err)
        setError(err.message || 'Failed to load customers.')
      } finally {
        setFetching(false)
      }
    }

    loadCustomers()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId || !title.trim() || !dueDate) {
      setError('Please fill in all required fields.')
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
        reminder_type: reminderType,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        status: 'pending',
        priority,
      }

      const { error: insertErr } = await supabase
        .from('reminders')
        .insert(payload)

      if (insertErr) throw insertErr

      router.push('/reminders')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save reminder.')
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
          Create Manual Reminder
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
          <p className="text-sm text-slate-500 mb-4">You need to add a customer first before setting a reminder.</p>
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
                Select Customer (เลือกลูกค้า) <span className="text-red-500">*</span>
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
                Reminder Type (ประเภทแจ้งเตือน)
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="general">General (แจ้งเตือนทั่วไป)</option>
                <option value="follow_up">Follow Up (ติดตามผล)</option>
                <option value="premium_due">Premium Due (ครบชำระเบี้ย)</option>
                <option value="birthday">Birthday (วันเกิด)</option>
                <option value="financial_review">Financial Review (รีวิวการเงิน)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Priority (ระดับความสำคัญ)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Reminder Title (หัวข้อการแจ้งเตือน) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. โทรนัดส่งกรมธรรม์ฉบับใหม่"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Due Date (วันที่ถึงกำหนด) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Description (รายละเอียด/บันทึก)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about what needs to be followed up..."
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
                Save Reminder
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
