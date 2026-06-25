'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2 } from 'lucide-react'

interface GiftFormProps {
  customerId: string
  gift?: any // If provided, we are in Edit mode
  onClose: () => void
  onSaved: () => void
}

export default function GiftForm({ customerId, gift, onClose, onSaved }: GiftFormProps) {
  const supabase = createClient() as any
  const [loading, setLoading] = useState(false)
  const [fetchingActivities, setFetchingActivities] = useState(true)

  // Options
  const [activities, setActivities] = useState<any[]>([])

  // Form Fields
  const [giftName, setGiftName] = useState(gift?.gift_name || '')
  const [giftCost, setGiftCost] = useState(gift?.gift_cost !== undefined ? String(gift.gift_cost) : '')
  const [giftDate, setGiftDate] = useState(() => {
    if (gift?.gift_date) return gift.gift_date
    // Default to current local date in YYYY-MM-DD
    const d = new Date()
    const tzOffset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]
  })
  const [activityId, setActivityId] = useState(gift?.activity_id || '')
  const [note, setNote] = useState(gift?.note || '')
  const [error, setError] = useState<string | null>(null)

  // Fetch recent activities for link options
  useEffect(() => {
    async function fetchActivities() {
      try {
        setFetchingActivities(true)
        const { data, error: actErr } = await supabase
          .from('activities')
          .select('id, activity_type, activity_date, summary')
          .eq('customer_id', customerId)
          .order('activity_date', { ascending: false })
          .limit(10)
        
        if (actErr) throw actErr
        setActivities(data || [])
      } catch (err: any) {
        console.error('Failed to fetch activities for gift linking:', err)
      } finally {
        setFetchingActivities(false)
      }
    }

    if (customerId) {
      fetchActivities()
    }
  }, [customerId, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giftName.trim()) {
      setError('Gift name is required.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        throw new Error('User not authenticated. Please log in again.')
      }

      const payload = {
        owner_id: user.id,
        customer_id: customerId,
        activity_id: activityId || null,
        gift_name: giftName.trim(),
        gift_cost: giftCost ? parseFloat(giftCost) : 0,
        gift_date: giftDate,
        note: note.trim() || null,
        updated_by: user.id,
      }

      if (gift?.id) {
        // Edit mode
        const { error: saveErr } = await supabase
          .from('gifts')
          .update(payload)
          .eq('id', gift.id)
        if (saveErr) throw saveErr
      } else {
        // Insert mode
        const { error: saveErr } = await supabase
          .from('gifts')
          .insert({
            ...payload,
            created_by: user.id,
          })
        if (saveErr) throw saveErr
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Error saving gift:', err)
      setError(err.message || 'Failed to save gift log.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {gift?.id ? 'Edit Gift Record' : 'Record Gift (บันทึกของขวัญ/ค่าใช้จ่ายเพื่อลูกค้า)'}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Track birthday cakes, calendar gifts, or coffee expenses for relationship building
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Gift/Expense Name (ชื่อของขวัญ/บริการ) *
            </label>
            <input
              type="text"
              value={giftName}
              onChange={(e) => setGiftName(e.target.value)}
              placeholder="e.g. Birthday Cake, Calendar AIA, Premium Coffee"
              required
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Cost (มูลค่า/ค่าใช้จ่าย THB)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={giftCost}
                onChange={(e) => setGiftCost(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Date (วันที่มอบให้) *
              </label>
              <input
                type="date"
                value={giftDate}
                onChange={(e) => setGiftDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Link to Interaction Activity (เชื่อมโยงกิจกรรม)
            </label>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              disabled={fetchingActivities}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none disabled:opacity-50"
            >
              <option value="">-- None (ไม่เชื่อมโยง) --</option>
              {activities.map((a) => {
                const dateStr = new Date(a.activity_date).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit'
                })
                return (
                  <option key={a.id} value={a.id}>
                    [{a.activity_type}] {dateStr} - {a.summary || 'No Details'}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Note (หมายเหตุเพิ่มเติม)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record any other notes about this gift or client response..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {gift?.id ? 'Save Changes' : 'Record Gift'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
