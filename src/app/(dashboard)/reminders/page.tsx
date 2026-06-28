'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { rolloverPolicyCycle, scanAndGenerateAllReminders, completePremiumReminderWithPayment } from '@/lib/reminders/reminder-service'
import ReminderModal from '@/components/reminders/reminder-modal'
import PremiumPaymentModal from '@/components/reminders/premium-payment-modal'
import {
  Bell,
  Plus,
  Loader2,
  Calendar,
  Search,
  ChevronRight,
  AlertTriangle
} from 'lucide-react'
import { parseISO, addDays } from 'date-fns'

interface Reminder {
  id: string
  customer_id: string
  policy_id: string | null
  reminder_type: 'premium_due' | 'birthday' | 'financial_review' | 'general' | 'follow_up'
  title: string
  description: string | null
  due_date: string
  reminder_offset_days: number
  status: 'pending' | 'done' | 'snoozed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  next_action_date: string | null
  completed_at: string | null
  google_event_id?: string | null
  google_sync_status?: 'unsynced' | 'synced' | 'failed' | null
  google_sync_enabled?: boolean
  customers: {
    full_name: string
  } | null
  policies: {
    id: string
    policy_number: string
    plan_name: string | null
    company: string
    premium_amount: number | null
  } | null
}

const statusTabs = [
  { value: 'all', label: 'All (ทั้งหมด)' },
  { value: 'pending', label: 'Pending (รอดำเนินการ)' },
  { value: 'snoozed', label: 'Snoozed (เลื่อนนัด)' },
  { value: 'done', label: 'Done (เสร็จสิ้น)' },
  { value: 'cancelled', label: 'Cancelled (ยกเลิก)' },
]

export default function RemindersPage() {
  const supabase = useMemo(() => createClient() as any, [])
  const [loading, setLoading] = useState(true)
  const [reminders, setReminders] = useState<Reminder[]>([])
  
  // Filtering & Modal state
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentReminder, setPaymentReminder] = useState<Reminder | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [searchQuery])

  const loadReminders = useCallback(async (options?: { showSpinner?: boolean }) => {
    const showSpinner = options?.showSpinner ?? true
    if (showSpinner) setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('reminders')
        .select('*, customers(full_name), policies(id, policy_number, plan_name, company, premium_amount)')
        .eq('owner_id', user.id)

      // Apply Search Filter
      if (debouncedSearchQuery) {
        query = query.ilike('title', `%${debouncedSearchQuery}%`)
      }

      // Apply Status Tab Filter
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab)
      }

      // Apply Reminder Type Filter
      if (selectedType !== 'all') {
        query = query.eq('reminder_type', selectedType)
      }

      // Sort by due date (closest/past due first)
      query = query.order('due_date', { ascending: true })

      const { data, error } = await query
      if (error) throw error
      setReminders(data || [])
    } catch (err) {
      console.error('Error fetching reminders:', err)
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [activeTab, debouncedSearchQuery, selectedType, supabase])
  const loadRemindersRef = useRef(loadReminders)

  useEffect(() => {
    loadRemindersRef.current = loadReminders
  }, [loadReminders])

  useEffect(() => {
    loadReminders()
  }, [loadReminders])

  useEffect(() => {
    let isMounted = true

    // Run self-healing reminder generation in the background. The list query
    // above should not wait for this scanner to finish.
    async function initScan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (isMounted) setIsScanning(true)
      try {
        const hasNewReminders = await scanAndGenerateAllReminders(supabase, user.id)
        
        if (hasNewReminders && isMounted) {
          await loadRemindersRef.current({ showSpinner: false })

          // Trigger batch sync after background scan finishes to auto-upload newly generated items
          fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch: true }),
          }).catch((err) => console.error('Failed to run background calendar batch sync:', err))
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setIsScanning(false)
      }
    }
    initScan()

    return () => {
      isMounted = false
    }
  }, [supabase])

  const handleMarkDone = async (reminder: Reminder) => {
    if (reminder.reminder_type === 'premium_due' && reminder.policy_id) {
      setPaymentReminder(reminder)
      setPaymentModalOpen(true)
      return
    }

    setActionId(reminder.id)
    try {
      await supabase
        .from('reminders')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', reminder.id)

      // Trigger Google Calendar Sync
      await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: reminder.id }),
      }).catch((err) => console.error('Failed to sync calendar on completion:', err))

      loadReminders()
    } catch (err) {
      console.error('Error completing reminder:', err)
    } finally {
      setActionId(null)
    }
  }

  const handleConfirmPayment = async (amountPaid: number, paymentDate: string) => {
    if (!paymentReminder) return
    setActionId(paymentReminder.id)
    try {
      await completePremiumReminderWithPayment(supabase, {
        policyId: paymentReminder.policy_id!,
        reminderId: paymentReminder.id,
        customerId: paymentReminder.customer_id,
        amountPaid: amountPaid,
        paymentDate: paymentDate,
      })

      // Trigger Google Calendar Sync
      await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: paymentReminder.id }),
      }).catch((err) => console.error('Failed to sync calendar on completion:', err))

      loadReminders()
    } catch (err) {
      console.error('Error completing reminder with payment:', err)
      throw err
    } finally {
      setActionId(null)
      setPaymentReminder(null)
    }
  }

  const handleSnooze = async (reminder: Reminder) => {
    setActionId(reminder.id)
    try {
      // Add 3 days to due date as a default snooze period
      const newDueDate = addDays(parseISO(reminder.due_date), 3)
      const newDueDateStr = newDueDate.toISOString().split('T')[0]

      await supabase
        .from('reminders')
        .update({
          status: 'snoozed',
          due_date: newDueDateStr,
          next_action_date: newDueDateStr,
        })
        .eq('id', reminder.id)

      // Trigger Google Calendar Sync
      await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: reminder.id }),
      }).catch((err) => console.error('Failed to sync calendar on snooze:', err))

      loadReminders()
    } catch (err) {
      console.error('Error snoozing reminder:', err)
    } finally {
      setActionId(null)
    }
  }

  const handleCancel = async (reminder: Reminder) => {
    setActionId(reminder.id)
    try {
      await supabase
        .from('reminders')
        .update({ status: 'cancelled' })
        .eq('id', reminder.id)

      // Trigger Google Calendar Sync
      await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: reminder.id }),
      }).catch((err) => console.error('Failed to sync calendar on cancel:', err))

      loadReminders()
    } catch (err) {
      console.error('Error cancelling reminder:', err)
    } finally {
      setActionId(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'normal':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getReminderIconBg = (type: string) => {
    switch (type) {
      case 'premium_due':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
      case 'birthday':
        return 'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400'
      case 'financial_review':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
      case 'follow_up':
      case 'general':
      default:
        return 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Reminders (การแจ้งเตือน)
            {(loading || isScanning) && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage automated and manual CRM schedules.</p>
        </div>
        <Link
          href="/reminders/new"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10 transition-transform active:scale-95"
          title="Add Reminder"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-[1px] gap-2">
        {statusTabs.map((tab) => {
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value)
                setLoading(true)
              }}
              className={`py-3 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-650 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search and filter type controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search reminders by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
          >
            <option value="all">All Types (ทุกประเภท)</option>
            <option value="premium_due">Premium Due</option>
            <option value="birthday">Birthday</option>
            <option value="financial_review">Financial Review</option>
            <option value="general">General</option>
            <option value="follow_up">Follow Up</option>
          </select>
        </div>
      </div>

      {/* List cards */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-4">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Reminders Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            You are all caught up! No scheduled tasks match this status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => {
            const today = new Date().toISOString().split('T')[0]
            const isOverdue = reminder.status === 'pending' && reminder.due_date < today

            return (
              <div
                key={reminder.id}
                onClick={() => setSelectedReminder(reminder)}
                className={`p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex justify-between items-center gap-4 transition-all hover:shadow-md cursor-pointer ${
                  isOverdue ? 'border-l-4 border-l-red-500' : ''
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${getReminderIconBg(reminder.reminder_type)}`}>
                    <Bell className="h-5 w-5" />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getPriorityColor(reminder.priority)}`}>
                        {reminder.priority}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-500 flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />
                        {reminder.due_date}
                      </span>
                      {isOverdue && (
                        <span className="text-[9px] font-bold text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> OVERDUE
                        </span>
                      )}
                      {reminder.google_sync_enabled && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-0.5 ${
                          reminder.google_sync_status === 'synced'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-transparent'
                            : reminder.google_sync_status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/20 dark:text-rose-450 dark:border-transparent'
                            : 'bg-slate-50 text-slate-650 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-transparent'
                        }`}>
                          {reminder.google_sync_status === 'synced' ? 'GCal Synced' : reminder.google_sync_status === 'failed' ? 'GCal Failed' : 'GCal Pending'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {reminder.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      Client: {reminder.customers?.full_name || '—'}
                    </p>
                  </div>
                </div>

                <div
                  className="flex gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()} // Stop modal trigger
                >
                  {reminder.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleMarkDone(reminder)}
                        disabled={actionId === reminder.id}
                        className="h-8 px-3 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                        title="Mark Done"
                      >
                        {actionId === reminder.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Done'
                        )}
                      </button>
                      <button
                        onClick={() => handleSnooze(reminder)}
                        disabled={actionId === reminder.id}
                        className="h-8 px-3 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-colors"
                        title="Snooze 3 days"
                      >
                        Snooze
                      </button>
                      <button
                        onClick={() => handleCancel(reminder)}
                        disabled={actionId === reminder.id}
                        className="h-8 px-3 bg-red-50 text-red-650 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 self-center" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reminder Action Drawer/Modal */}
      {selectedReminder && (
        <ReminderModal
          reminder={selectedReminder}
          onClose={() => setSelectedReminder(null)}
          onSaved={() => {
            setSelectedReminder(null)
            loadReminders()
          }}
        />
      )}

      {/* Premium Payment Confirmation Modal */}
      {paymentReminder && (
        <PremiumPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setPaymentReminder(null)
          }}
          onConfirm={handleConfirmPayment}
          defaultAmount={paymentReminder.policies?.premium_amount || 0}
          planName={paymentReminder.policies?.plan_name || '—'}
          policyNumber={paymentReminder.policies?.policy_number || ''}
          clientName={paymentReminder.customers?.full_name || 'ลูกค้า'}
        />
      )}
    </div>
  )
}
