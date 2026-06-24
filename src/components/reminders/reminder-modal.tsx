'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, AlertTriangle, Loader2 } from 'lucide-react'

interface ReminderModalProps {
  reminder: any
  onClose: () => void
  onSaved: () => void
}

export default function ReminderModal({ reminder, onClose, onSaved }: ReminderModalProps) {
  const supabase = createClient() as any
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(reminder.status)
  const [priority, setPriority] = useState(reminder.priority)
  const [nextActionDate, setNextActionDate] = useState(reminder.next_action_date || '')
  const [description, setDescription] = useState(reminder.description || '')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      const payload = {
        status,
        priority,
        next_action_date: nextActionDate || null,
        description: description.trim() || null,
      }

      const { error: saveErr } = await supabase
        .from('reminders')
        .update(payload)
        .eq('id', reminder.id)

      if (saveErr) throw saveErr
      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Error saving reminder details:', err)
      setError(err.message || 'Failed to update reminder.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Reminder Details ({reminder.reminder_type})
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[280px]">
              {reminder.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Description (รายละเอียด)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Status (สถานะ)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="snoozed">Snoozed</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Priority (ความเร่งด่วน)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
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
              Next Action Date (วันที่จะดำเนินการครั้งถัดไป)
            </label>
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
