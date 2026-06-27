'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2 } from 'lucide-react'

interface ReminderFormProps {
  customerId: string
  customerName?: string
  onClose: () => void
  onSaved: () => void
}

export default function ReminderForm({
  customerId,
  customerName,
  onClose,
  onSaved,
}: ReminderFormProps) {
  const supabase = createClient() as any
  const [loading, setLoading] = useState(false)
  const [reminderType, setReminderType] = useState<'general' | 'follow_up' | 'premium_due' | 'birthday' | 'financial_review'>('general')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !dueDate) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        throw new Error('Not authenticated. Please log in again.')
      }

      const payload = {
        owner_id: user.id,
        customer_id: customerId,
        reminder_type: reminderType,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        status: 'pending',
        priority,
        google_sync_enabled: googleSyncEnabled,
      }

      const { data: newRem, error: insertErr } = await supabase
        .from('reminders')
        .insert(payload)
        .select('id')
        .single()

      if (insertErr) throw insertErr

      if (newRem?.id && googleSyncEnabled) {
        // Trigger calendar sync asynchronously
        fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminderId: newRem.id }),
        }).catch((err) => console.error('Failed to trigger calendar sync:', err))
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Error saving reminder:', err)
      setError(err.message || 'Failed to save reminder.')
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
              Create New Reminder (สร้างการแจ้งเตือน)
            </h3>
            {customerName && (
              <p className="text-[10px] text-indigo-650 dark:text-indigo-400 font-semibold mt-0.5">
                For: {customerName}
              </p>
            )}
          </div>
          <button
            type="button"
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
              Reminder Title (หัวข้อการแจ้งเตือน) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. โทรนัดส่งกรมธรรม์ฉบับใหม่"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Reminder Type (ประเภทแจ้งเตือน)
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="general">General (แจ้งเตือนทั่วไป)</option>
                <option value="follow_up">Follow Up (ติดตามผล)</option>
                <option value="premium_due">Premium Due (ครบชำระเบี้ย)</option>
                <option value="birthday">Birthday (วันเกิด)</option>
                <option value="financial_review">Financial Review (รีวิวการเงิน)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Priority (ระดับความสำคัญ)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Due Date (วันที่ถึงกำหนด) *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Description (รายละเอียด/บันทึก)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about what needs to be followed up..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1 select-none">
            <input
              type="checkbox"
              id="googleSyncEnabledModal"
              checked={googleSyncEnabled}
              onChange={(e) => setGoogleSyncEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="googleSyncEnabledModal" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide cursor-pointer">
              Sync to Google Calendar (บันทึกลงปฏิทิน Google อัตโนมัติ)
            </label>
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
                  Save Reminder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
