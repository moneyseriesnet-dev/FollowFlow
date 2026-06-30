'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, AlertTriangle, Loader2 } from 'lucide-react'
import { completePremiumReminderWithPayment } from '@/lib/reminders/reminder-service'

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
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(reminder.google_sync_enabled !== false)
  const [error, setError] = useState<string | null>(null)

  // Premium payment logging fields
  const isPremiumDue = reminder.reminder_type === 'premium_due'
  const [amountPaid, setAmountPaid] = useState<string>(() => {
    if (reminder.amount_paid !== undefined && reminder.amount_paid !== null) {
      return String(reminder.amount_paid)
    }
    return String(reminder.policies?.premium_amount || '')
  })
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    if (reminder.completed_at) {
      return reminder.completed_at.split('T')[0]
    }
    const d = new Date()
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().split('T')[0]
  })

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Update standard details
      const payload: any = {
        priority,
        next_action_date: nextActionDate || null,
        description: description.trim() || null,
        google_sync_enabled: googleSyncEnabled,
      }

      if (isPremiumDue) {
        payload.amount_paid = amountPaid ? parseFloat(amountPaid) : null
      }

      const { error: saveErr } = await supabase
        .from('reminders')
        .update(payload)
        .eq('id', reminder.id)

      if (saveErr) throw saveErr

      // 2. Perform special payment rollover if status is set to Done for premium due
      if (isPremiumDue && status === 'done' && reminder.policy_id) {
        const amt = parseFloat(amountPaid)
        if (isNaN(amt) || amt < 0) {
          throw new Error('กรุณาระบุจำนวนเงินชำระจริงที่ถูกต้อง')
        }
        const fullISODate = new Date(`${paymentDate}T12:00:00`).toISOString()

        await completePremiumReminderWithPayment(supabase, {
          policyId: reminder.policy_id,
          reminderId: reminder.id,
          customerId: reminder.customer_id,
          amountPaid: amt,
          paymentDate: fullISODate,
        })
      } else {
        // Otherwise, perform a simple status update
        const updatePayload: any = { status }
        if (isPremiumDue) {
          updatePayload.amount_paid = amountPaid ? parseFloat(amountPaid) : null
        }

        const { error: statusErr } = await supabase
          .from('reminders')
          .update(updatePayload)
          .eq('id', reminder.id)

        if (statusErr) throw statusErr
      }

      // Trigger calendar sync asynchronously
      fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: reminder.id }),
      }).catch((err) => console.error('Failed to trigger calendar sync:', err))

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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
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
          {/* Policy Details for Premium Due */}
          {isPremiumDue && (
            <div className="space-y-3">
              <div className="p-3.5 bg-indigo-50/55 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/30 text-xs text-slate-700 dark:text-slate-350 space-y-1 select-none">
                <p className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider">ข้อมูลกรมธรรม์และยอดค้างชำระ</p>
                <p className="font-semibold text-slate-900 dark:text-white">ลูกค้า: {reminder.customers?.full_name || 'ลูกค้า'}</p>
                <p>แผนประกัน: {reminder.policies?.plan_name || '—'}</p>
                <p className="font-mono text-[11px]">เลขที่กรมธรรม์: {reminder.policies?.policy_number || '—'}</p>
                <p>กำหนดชำระ (Due Date): {reminder.due_date}</p>
              </div>

              {/* Amount expected vs collected fields */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1 select-none">
                    เบี้ยประกันตามกำหนด (฿)
                  </label>
                  <div className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 flex items-center font-bold">
                    ฿{reminder.policies?.premium_amount?.toLocaleString() || '0'}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">
                    ยอดชำระจริง (฿)
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 focus:outline-none font-bold text-slate-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

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

          {/* Payment Details Form if Status is Done for Premium Due */}
          {isPremiumDue && status === 'done' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wide mb-1">
                วันที่ชำระเงิน
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none font-semibold text-slate-900 dark:text-white"
                required
              />
            </div>
          )}

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

          <div className="flex items-center gap-2 pt-1 select-none">
            <input
              type="checkbox"
              id="googleSyncEnabledModal"
              checked={googleSyncEnabled}
              onChange={(e) => setGoogleSyncEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="googleSyncEnabledModal" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide cursor-pointer">
              Sync to Google Calendar (บันทึกลงปฏิทิน Google)
            </label>
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
