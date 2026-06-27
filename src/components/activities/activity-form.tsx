'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Save, Loader2 } from 'lucide-react'

interface ActivityFormProps {
  customerId: string
  activity?: any // If provided, we are in Edit mode
  onClose: () => void
  onSaved: () => void
  defaultType?: string
  defaultSummary?: string
}

export default function ActivityForm({ 
  customerId, 
  activity, 
  onClose, 
  onSaved, 
  defaultType, 
  defaultSummary 
}: ActivityFormProps) {
  const supabase = createClient() as any
  const [loading, setLoading] = useState(false)
  const [fetchingOptions, setFetchingOptions] = useState(true)

  // Options
  const [policies, setPolicies] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])

  // Form Fields
  const [activityType, setActivityType] = useState(activity?.activity_type || defaultType || 'phone_call')
  const [activityDate, setActivityDate] = useState(() => {
    if (activity?.activity_date) {
      // Convert to YYYY-MM-DDTHH:MM for datetime-local
      const d = new Date(activity.activity_date)
      const tzOffset = d.getTimezoneOffset() * 60000
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
      return localISOTime
    }
    // Default to current local time in YYYY-MM-DDTHH:MM
    const d = new Date()
    const tzOffset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
  })
  const [policyId, setPolicyId] = useState(activity?.policy_id || '')
  const [reminderId, setReminderId] = useState(activity?.reminder_id || '')
  const [summary, setSummary] = useState(activity?.summary || defaultSummary || '')
  const [result, setResult] = useState(activity?.result || '')
  const [statusAfterActivity, setStatusAfterActivity] = useState(activity?.status_after_activity || '')
  const [nextActionDate, setNextActionDate] = useState(activity?.next_action_date || '')
  const [error, setError] = useState<string | null>(null)

  // Fetch policies and reminders for the dropdown options
  useEffect(() => {
    async function fetchOptions() {
      try {
        setFetchingOptions(true)
        
        // 1. Fetch policies
        const { data: pols, error: polsErr } = await supabase
          .from('policies')
          .select('id, policy_number, plan_name, company')
          .eq('customer_id', customerId)
        if (polsErr) throw polsErr
        setPolicies(pols || [])

        // 2. Fetch reminders
        const { data: rems, error: remsErr } = await supabase
          .from('reminders')
          .select('id, title, reminder_type, due_date')
          .eq('customer_id', customerId)
          .in('status', ['pending', 'snoozed'])
        if (remsErr) throw remsErr
        setReminders(rems || [])

      } catch (err: any) {
        console.error('Failed to load activity details selection options:', err)
      } finally {
        setFetchingOptions(false)
      }
    }

    if (customerId) {
      fetchOptions()
    }
  }, [customerId, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get current authenticated user
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        throw new Error('User not authenticated. Please log in again.')
      }

      const payload: any = {
        owner_id: user.id,
        customer_id: customerId,
        policy_id: policyId || null,
        reminder_id: reminderId || null,
        activity_type: activityType,
        activity_date: new Date(activityDate).toISOString(),
        summary: summary.trim() || null,
        result: result.trim() || null,
        status_after_activity: statusAfterActivity.trim() || null,
        next_action_date: nextActionDate || null,
        updated_by: user.id,
      }

      if (activity?.id) {
        // Reset to pending if the next action date is updated
        if (activity.next_action_date !== nextActionDate) {
          payload.next_action_status = 'pending'
          payload.next_action_completed_at = null
        }
        // Update mode
        const { error: saveErr } = await supabase
          .from('activities')
          .update(payload)
          .eq('id', activity.id)
        if (saveErr) throw saveErr
      } else {
        // Insert mode
        const { error: saveErr } = await supabase
          .from('activities')
          .insert({
            ...payload,
            next_action_status: 'pending',
            next_action_completed_at: null,
            created_by: user.id,
          })
        if (saveErr) throw saveErr
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error('Error saving activity:', err)
      setError(err.message || 'Failed to save activity log.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {activity?.id ? 'Edit Activity Log' : 'Log New Activity (บันทึกกิจกรรมการติดตาม)'}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Record meetings, calls, Line chats, and schedule follow-ups
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Activity Type (ประเภทกิจกรรม) *
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              >
                <option value="phone_call">Phone Call (โทรศัพท์)</option>
                <option value="line_chat">Line Chat (ไลน์คุย)</option>
                <option value="meeting">Meeting (พบปะ)</option>
                <option value="email">Email (อีเมล)</option>
                <option value="policy_delivery">Policy Delivery (ส่งมอบกรมธรรม์)</option>
                <option value="claim_support">Claim Support (ช่วยเหลือเคลม)</option>
                <option value="follow_up">Follow Up (ติดตามงาน)</option>
                <option value="other">Other (อื่นๆ)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Date & Time (วันและเวลา) *
              </label>
              <input
                type="datetime-local"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Link to Policy (เชื่อมโยงกรมธรรม์)
              </label>
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                disabled={fetchingOptions}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none disabled:opacity-50"
              >
                <option value="">-- None (ไม่เชื่อมโยง) --</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.company}] {p.policy_number} - {p.plan_name || 'No Plan Name'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Link to Reminder (เชื่อมโยงเตือนความจำ)
              </label>
              <select
                value={reminderId}
                onChange={(e) => setReminderId(e.target.value)}
                disabled={fetchingOptions}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none disabled:opacity-50"
              >
                <option value="">-- None (ไม่เชื่อมโยง) --</option>
                {reminders.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.reminder_type}] {r.title} (Due: {r.due_date})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Summary (สรุปรายละเอียดการสนทนา)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What did you discuss? (เช่น ลูกค้าสนใจออมระยะสั้นเพิ่มเติม)"
              rows={2}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Result (ผลลัพธ์)
            </label>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="What was the outcome? (เช่น ขอเอกสารประกอบการตัดสินใจส่งทางไลน์)"
              rows={2}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Status after Activity (สถานะหลังเสร็จกิจกรรม)
              </label>
              <input
                type="text"
                value={statusAfterActivity}
                onChange={(e) => setStatusAfterActivity(e.target.value)}
                placeholder="e.g. Follow Up Next Week, Closed, Proposal Sent"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
              />
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
                  {activity?.id ? 'Save Changes' : 'Log Activity'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
