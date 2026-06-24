'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, Save } from 'lucide-react'

interface CustomerLevel {
  id: string
  name: string
  color: string | null
}

interface CustomerFormProps {
  customerId?: string // If present, we are editing
}

export default function CustomerForm({ customerId }: CustomerFormProps) {
  const router = useRouter()
  const supabase = createClient() as any

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!customerId)
  const [levels, setLevels] = useState<CustomerLevel[]>([])
  
  // Form fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [lineId, setLineId] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [levelId, setLevelId] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived'>('active')
  const [personalNote, setPersonalNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fetch levels and customer details if editing
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('User not authenticated')
          return
        }

        // 1. Fetch customer levels
        let { data: levelsData, error: levelsErr } = await supabase
          .from('customer_levels')
          .select('id, name, color')
          .order('name')

        if (levelsErr) throw levelsErr

        // 2. If no levels exist, seed them automatically
        if (!levelsData || levelsData.length === 0) {
          const defaultLevels = [
            { owner_id: user.id, name: 'VIP', color: '#EAB308', rule_type: 'manual' },
            { owner_id: user.id, name: 'Standard', color: '#3B82F6', rule_type: 'manual' },
            { owner_id: user.id, name: 'Watchlist', color: '#EF4444', rule_type: 'manual' }
          ]
          const { data: seeded, error: seedErr } = await supabase
            .from('customer_levels')
            .insert(defaultLevels)
            .select()

          if (seedErr) throw seedErr
          levelsData = seeded
        }

        setLevels(levelsData || [])
        
        // Default to first level
        if (levelsData && levelsData.length > 0 && !levelId) {
          setLevelId(levelsData[0].id)
        }

        // 3. Load customer data if editing
        if (customerId) {
          const { data: customer, error: customerErr } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single()

          if (customerErr) throw customerErr

          if (customer) {
            setFullName(customer.full_name)
            setPhone(customer.phone || '')
            setEmail(customer.email || '')
            setLineId(customer.line_id || '')
            setBirthDate(customer.birth_date || '')
            setAddress(customer.address || '')
            setLevelId(customer.customer_level_id || '')
            setStatus(customer.status || 'active')
            setPersonalNote(customer.personal_note || '')
          }
        }
      } catch (err: any) {
        console.error('Error loading form data:', err)
        setError(err.message || 'Failed to load form details.')
      } finally {
        setFetching(false)
      }
    }

    loadData()
  }, [customerId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        owner_id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        line_id: lineId.trim() || null,
        birth_date: birthDate || null,
        address: address.trim() || null,
        customer_level_id: levelId || null,
        status,
        personal_note: personalNote.trim() || null,
      }

      if (customerId) {
        const { error: updateErr } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customerId)

        if (updateErr) throw updateErr
        router.push(`/customers/${customerId}`)
      } else {
        const { error: insertErr } = await supabase
          .from('customers')
          .insert(payload)

        if (insertErr) throw insertErr
        router.push('/customers')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save customer.')
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
          {customerId ? 'Edit Customer' : 'Add New Customer'}
        </h2>
        <div className="w-12" /> {/* Spacer */}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Full Name (ชื่อ-นามสกุล) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. สมชาย รักดี"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Phone Number (เบอร์โทรศัพท์)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0812345678"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Line ID (ไอดีไลน์)
            </label>
            <input
              type="text"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              placeholder="e.g. somchai_line"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Email Address (อีเมล)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. somchai@example.com"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Birth Date (วันเกิด)
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Customer Level (ระดับลูกค้า)
            </label>
            <select
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {levels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Status (สถานะ)
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="active">Active (ปกติ)</option>
              <option value="inactive">Inactive (ระงับ)</option>
              <option value="archived">Archived (เก็บถาวร)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Address (ที่อยู่)
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full mailing address..."
              rows={3}
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Personal Note (บันทึกส่วนตัว)
            </label>
            <textarea
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Important customer notes, interactions or preferences..."
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
              {customerId ? 'Save Changes' : 'Create Customer'}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
