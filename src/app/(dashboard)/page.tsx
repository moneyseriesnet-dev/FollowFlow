'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { scanAndGenerateAllReminders, rolloverPolicyCycle, completePremiumReminderWithPayment } from '@/lib/reminders/reminder-service'
import PremiumPaymentModal from '@/components/reminders/premium-payment-modal'
import ReminderModal from '@/components/reminders/reminder-modal'
import {
  Users,
  FileText,
  Bell,
  Gift,
  Camera,
  UserPlus,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  Calendar,
  CheckCircle,
  Phone,
  MessageCircle,
  Coins,
  Clock,
  ListTodo
} from 'lucide-react'
import {
  differenceInDays,
  parseISO,
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths
} from 'date-fns'

interface PriorityActionItem {
  id: string
  type: 'reminder' | 'customer_vip'
  priorityRank: number
  priorityLabel: string
  title: string
  subtitle: string
  dueDate: string | null
  level: 'critical' | 'warning' | 'info'
  link: string
  rawItem: any
  daysUntilDue?: number
}

export default function DashboardPage() {
  const router = useRouter()

  // Memoize the Supabase client so it is only created once per mount,
  // and does NOT change reference on every render (preventing useEffect loops).
  const supabase = useMemo(() => createClient() as any, [])

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    customers: 0,
    policies: 0,
    reminders: 0,
    giftCosts: 0
  })
  const [actionItems, setActionItems] = useState<PriorityActionItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'premium' | 'birthday' | 'appointment'>('all')

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentReminder, setPaymentReminder] = useState<PriorityActionItem | null>(null)
  const [activeReminder, setActiveReminder] = useState<any | null>(null)

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString().split('T')[0]

      const [giftsResult, remindersResult, customersResult, policiesCountResult] =
        await Promise.all([
          // 1. Gifts this month (sum only)
          supabase
            .from('gifts')
            .select('gift_cost')
            .eq('owner_id', user.id)
            .gte('gift_date', startOfMonth),

          // 2. Pending reminders with joins (full data)
          supabase
            .from('reminders')
            .select(
              '*, customers(full_name, customer_levels!customers_customer_level_id_fkey(name)), policies(id, policy_number, plan_name, company, payment_frequency, next_premium_due_date, premium_amount)'
            )
            .eq('owner_id', user.id)
            .eq('status', 'pending'),

          // 3. Active customers with level (full data)
          supabase
            .from('customers')
            .select('*, customer_levels!customers_customer_level_id_fkey(name, color)')
            .eq('owner_id', user.id)
            .eq('status', 'active'),

          // 4. Active policies count (separate because we only need count here)
          supabase
            .from('policies')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.id)
            .eq('policy_status', 'active'),
        ])

      const pendingReminders = remindersResult.data ?? []
      const allCustomers = customersResult.data ?? []
      const gifts = giftsResult.data ?? []
      const totalGiftsSum = gifts.reduce(
        (acc: number, curr: any) => acc + Number(curr.gift_cost || 0),
        0
      )

      setStats({
        customers: allCustomers.length,
        policies: policiesCountResult.count ?? 0,
        reminders: pendingReminders.length,
        giftCosts: totalGiftsSum,
      })

      // ─── Compute Priority Action Items ──────────────────────────────
      const items: PriorityActionItem[] = []
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      // ── Map Pending Reminders ─────────────────────────────────────
      if (pendingReminders.length > 0) {
        // Group premium_due reminders by policy_id to avoid duplicates
        const premiumRemindersByPolicy = new Map<string, any[]>()
        const otherReminders: any[] = []

        pendingReminders.forEach((rem: any) => {
          if (rem.reminder_offset_days === 1) return // Skip 1-day reminders on Dashboard
          if (rem.reminder_type === 'premium_due' && rem.policy_id) {
            if (!premiumRemindersByPolicy.has(rem.policy_id)) {
              premiumRemindersByPolicy.set(rem.policy_id, [])
            }
            premiumRemindersByPolicy.get(rem.policy_id)!.push(rem)
          } else {
            otherReminders.push(rem)
          }
        })

        // 1. Process Grouped Premium Reminders
        premiumRemindersByPolicy.forEach((rems, policyId) => {
          const rem = rems[0]
          const policy = rem.policies
          if (!policy || !policy.next_premium_due_date) return

          const dueDate = parseISO(policy.next_premium_due_date)
          const daysUntilDue = differenceInDays(dueDate, today)

          // Only filter out future reminders beyond 30 days.
          // Overdue items (daysUntilDue < 0) always show regardless of how long ago.
          if (daysUntilDue > 30) return

          let priorityRank = 6
          let priorityLabel = '🔵 Premium Due 30 Days'
          let level: 'critical' | 'warning' | 'info' = 'info'

          if (daysUntilDue < 0) {
            priorityRank = 1
            priorityLabel = '🔴 Overdue (เกินกำหนดชำระ)'
            level = 'critical'
          } else if (daysUntilDue <= 3) {
            priorityRank = 2
            priorityLabel = '🟠 Premium Due 1-3 Days'
            level = 'critical'
          } else if (daysUntilDue <= 7) {
            priorityRank = 3
            priorityLabel = '🟡 Premium Due 7 Days'
            level = 'warning'
          } else if (daysUntilDue <= 14) {
            priorityRank = 5
            priorityLabel = '🔵 Premium Due 14 Days'
            level = 'info'
          }

          const companyLabel = policy.company === 'AXA' ? 'AXA' : policy.company === 'AIA' ? 'AIA' : policy.company || 'OTHER'
          const clientName = rem.customers?.full_name || 'ลูกค้า'
          const title = `ชำระเบี้ย ${companyLabel} (${clientName})`
          
          const premiumAmount = policy.premium_amount ? `฿${policy.premium_amount.toLocaleString()}` : '—'
          const daysText = daysUntilDue < 0 
            ? `เกินกำหนดมา ${Math.abs(daysUntilDue)} วัน` 
            : daysUntilDue === 0 
            ? 'ครบกำหนดชำระวันนี้' 
            : `เหลืออีก ${daysUntilDue} วันจะถึงกำหนด`
          
          const subtitle = `แผน ${policy.plan_name || '—'} เลขกรมธรรม์ ${policy.policy_number} จำนวน ${premiumAmount} (${daysText})`

          items.push({
            id: `premium-policy-${policyId}`,
            type: 'reminder',
            priorityRank,
            priorityLabel,
            title,
            subtitle,
            dueDate: policy.next_premium_due_date,
            level,
            link: `/policies/${policyId}`,
            rawItem: {
              ...rem,
              daysUntilDue
            },
            daysUntilDue
          })
        })

        // 2. Process Other Reminders
        otherReminders.forEach((rem: any) => {
          const due = parseISO(rem.due_date)
          const daysDiff = differenceInDays(due, today)

          // Only filter out future reminders beyond 30 days.
          // Overdue items (daysDiff < 0) always show regardless of how long ago.
          if (daysDiff > 30) return
          
          // Priority 1: Overdue pending reminders
          if (rem.due_date < todayStr) {
            items.push({
              id: rem.id,
              type: 'reminder',
              priorityRank: 1,
              priorityLabel: '🔴 Overdue (ค้างทำ)',
              title: rem.title,
              subtitle: rem.description || '',
              dueDate: rem.due_date,
              level: 'critical',
              link: rem.reminder_type === 'birthday' ? `/customers/${rem.customer_id}` : `/policies/${rem.policy_id}`,
              rawItem: rem,
              daysUntilDue: daysDiff
            })
            return
          }

          // Priority 7: Birthday within 1 day
          if (rem.reminder_type === 'birthday' && daysDiff >= 0 && daysDiff <= 1) {
            items.push({
              id: rem.id,
              type: 'reminder',
              priorityRank: 7,
              priorityLabel: '🎂 Birthday Tomorrow',
              title: rem.title,
              subtitle: rem.description || '',
              dueDate: rem.due_date,
              level: 'critical',
              link: `/customers/${rem.customer_id}`,
              rawItem: rem,
              daysUntilDue: daysDiff
            })
            return
          }

          // Priority 8: Birthday within 30 days
          if (rem.reminder_type === 'birthday' && daysDiff > 1 && daysDiff <= 30) {
            items.push({
              id: rem.id,
              type: 'reminder',
              priorityRank: 8,
              priorityLabel: '🎂 Birthday 30 Days',
              title: rem.title,
              subtitle: rem.description || '',
              dueDate: rem.due_date,
              level: 'info',
              link: `/customers/${rem.customer_id}`,
              rawItem: rem,
              daysUntilDue: daysDiff
            })
            return
          }

          // Priority 9: Financial Review due
          if (rem.reminder_type === 'financial_review' && daysDiff <= 30) {
            items.push({
              id: rem.id,
              type: 'reminder',
              priorityRank: 9,
              priorityLabel: '📊 Financial Review Due',
              title: rem.title,
              subtitle: rem.description || '',
              dueDate: rem.due_date,
              level: 'warning',
              link: `/customers/${rem.customer_id}`,
              rawItem: rem,
              daysUntilDue: daysDiff
            })
            return
          }

          // Priority 9: General / Follow-up / Other reminders due within 30 days
          if (daysDiff >= 0 && daysDiff <= 30) {
            const isFollowUp = rem.reminder_type === 'follow_up'
            items.push({
              id: rem.id,
              type: 'reminder',
              priorityRank: 9,
              priorityLabel: isFollowUp ? '📞 Follow-up Task' : '📅 Action Task',
              title: rem.title,
              subtitle: rem.description || '',
              dueDate: rem.due_date,
              level: 'info',
              link: rem.customer_id ? `/customers/${rem.customer_id}` : (rem.policy_id ? `/policies/${rem.policy_id}` : '#'),
              rawItem: rem,
              daysUntilDue: daysDiff
            })
            return
          }
        })
      }

      // ── Map Customer Priorities ───────────────────────────────────
      if (allCustomers.length > 0) {
        allCustomers.forEach((cust: any) => {
          const levelName = cust.customer_levels?.name || ''
          
          // Priority 4: Special-follow-up (Watchlist) with pending tasks
          if (levelName === 'Watchlist') {
            const hasPendingReminders = pendingReminders.some((r: any) => r.customer_id === cust.id)
            if (hasPendingReminders) {
              items.push({
                id: `watchlist-${cust.id}`,
                type: 'customer_vip',
                priorityRank: 4,
                priorityLabel: '🚨 Watchlist Attention Required',
                title: `ลูกค้า Watchlist: คุณ ${cust.full_name}`,
                subtitle: `มีงานที่ค้างชำระ/อยู่ระหว่างดำเนินการกับลูกค้าท่านนี้`,
                dueDate: null,
                level: 'critical',
                link: `/customers/${cust.id}`,
                rawItem: cust
              })
            }
          }
        })
      }

      // Sort items by schedule (due date) closest to the current day first.
      items.sort((a, b) => {
        const hasDueA = a.dueDate !== null && a.daysUntilDue !== undefined
        const hasDueB = b.dueDate !== null && b.daysUntilDue !== undefined

        if (!hasDueA && !hasDueB) {
          return a.priorityRank - b.priorityRank
        }
        if (!hasDueA) return 1
        if (!hasDueB) return -1

        // Both have due dates
        const isOverdueA = a.daysUntilDue! < 0
        const isOverdueB = b.daysUntilDue! < 0

        if (isOverdueA && !isOverdueB) return -1
        if (!isOverdueA && isOverdueB) return 1

        // Both are overdue or both are upcoming
        if (a.daysUntilDue !== b.daysUntilDue) {
          return a.daysUntilDue! - b.daysUntilDue!
        }

        // Fallback to priorityRank
        return a.priorityRank - b.priorityRank
      })

      setActionItems(items)
      return pendingReminders.length
    } catch (err) {
      console.error('Error fetching dashboard records:', err)
      return 0
    }
  }, [supabase])

  useEffect(() => {
    let isMounted = true

    async function initDashboard(user: any) {
      const initialReminderCount = await loadDashboardData()
      if (isMounted) setLoading(false)

      // ── Background scan (self-healing reminder generator) ─────────
      if (isMounted) setIsScanning(true)

      scanAndGenerateAllReminders(supabase, user.id)
        .then(async (hasNewReminders) => {
          if (!isMounted) return

          // Trigger calendar sync asynchronously
          fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch: true }),
          }).catch((err) => console.error('Failed to trigger background calendar sync:', err))

          if (hasNewReminders) {
            await loadDashboardData()
          }
        })
        .catch((err) => {
          console.error('Scanning error:', err)
        })
        .finally(() => {
          if (isMounted) setIsScanning(false)
        })
    }

    // Wait for user to load
    async function getUserAndInit() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser && isMounted) {
        initDashboard(currentUser)
      }
    }

    getUserAndInit()

    return () => {
      isMounted = false
    }
  }, [supabase, loadDashboardData])

  // Categorize action items into three lists
  const premiumItems = actionItems.filter((item) => {
    if (item.type === 'reminder') {
      return item.rawItem?.reminder_type === 'premium_due'
    }
    return false
  })

  const birthdayItems = actionItems.filter((item) => {
    if (item.type === 'reminder') {
      return item.rawItem?.reminder_type === 'birthday'
    }
    return false
  })

  const appointmentItems = actionItems.filter((item) => {
    if (item.type === 'customer_vip') return true
    if (item.type === 'reminder') {
      const type = item.rawItem?.reminder_type
      return type !== 'premium_due' && type !== 'birthday'
    }
    return false
  })

  const filteredItems = actionItems.filter((item) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'premium') {
      return item.type === 'reminder' && item.rawItem?.reminder_type === 'premium_due'
    }
    if (activeFilter === 'birthday') {
      return item.type === 'reminder' && item.rawItem?.reminder_type === 'birthday'
    }
    if (activeFilter === 'appointment') {
      if (item.type === 'customer_vip') return true
      if (item.type === 'reminder') {
        const type = item.rawItem?.reminder_type
        return type !== 'premium_due' && type !== 'birthday'
      }
      return false
    }
    return true
  })

  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const weeks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    return weeks
  }, [currentMonth])

  const getItemsForDate = useCallback((date: Date) => {
    return filteredItems.filter(item => {
      if (!item.dueDate) return false
      try {
        const itemDate = parseISO(item.dueDate)
        return isSameDay(itemDate, date)
      } catch {
        return false
      }
    })
  }, [filteredItems])

  const handleMarkDone = async (item: PriorityActionItem) => {
    if (item.type !== 'reminder') return
    
    const rem = item.rawItem
    if (rem.reminder_type === 'premium_due' && rem.policy_id) {
      setPaymentReminder(item)
      setPaymentModalOpen(true)
      return
    }

    setProcessingId(item.id)
    try {
      // Simple update status to done
      await supabase
        .from('reminders')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', rem.id)

      // Trigger Google Calendar Sync
      await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: rem.id }),
      }).catch((err) => console.error('Failed to sync calendar on completion:', err))

      // Remove from view
      setActionItems((prev) => prev.filter((i) => i.id !== item.id))
      setStats((prev) => ({ ...prev, reminders: Math.max(0, prev.reminders - 1) }))
    } catch (err) {
      console.error('Error resolving action item:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleConfirmPayment = async (amountPaid: number, paymentDate: string) => {
    if (!paymentReminder || !paymentReminder.rawItem) return
    const rem = paymentReminder.rawItem
    setProcessingId(paymentReminder.id)
    try {
      await completePremiumReminderWithPayment(supabase, {
        policyId: rem.policy_id,
        reminderId: rem.id,
        customerId: rem.customer_id,
        amountPaid: amountPaid,
        paymentDate: paymentDate,
      })

      // Trigger Google Calendar Sync
      await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: rem.id }),
      }).catch((err) => console.error('Failed to sync calendar on completion:', err))

      // Remove from view
      setActionItems((prev) => prev.filter((i) => i.id !== paymentReminder.id))
      setStats((prev) => ({ ...prev, reminders: Math.max(0, prev.reminders - 1) }))
    } catch (err) {
      console.error('Error resolving action item with payment:', err)
      throw err
    } finally {
      setProcessingId(null)
      setPaymentReminder(null)
    }
  }

  const getUrgencyClasses = (level: 'critical' | 'warning' | 'info') => {
    switch (level) {
      case 'critical':
        return 'border-l-4 border-l-rose-500 bg-rose-500/5 dark:bg-rose-950/10'
      case 'warning':
        return 'border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-950/10'
      case 'info':
      default:
        return 'border-l-4 border-l-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/10'
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  const renderRow = (item: PriorityActionItem) => {
    const daysUntilDue = item.daysUntilDue
    const showDaysBadge = daysUntilDue !== undefined

    return (
      <div
        key={item.id}
        className={`p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex flex-row items-center gap-4 transition-all hover:shadow-md ${getUrgencyClasses(item.level)}`}
      >
        {showDaysBadge && (
          <div className={`flex flex-col items-center justify-center shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl border text-center p-1 select-none shadow-sm ${
            item.level === 'critical'
              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400'
              : item.level === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-400'
          }`}>
            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold opacity-80">
              {daysUntilDue < 0 ? 'เกิน' : 'อีก'}
            </span>
            <span className="text-lg sm:text-xl font-black leading-none my-0.5">
              {Math.abs(daysUntilDue)}
            </span>
            <span className="text-[8px] sm:text-[9px] font-extrabold opacity-80">
              วัน
            </span>
          </div>
        )}

        <div className="space-y-0.5 sm:space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] sm:text-[9px] font-bold tracking-wider uppercase bg-slate-50 dark:bg-slate-850 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-750 shadow-sm text-slate-655 dark:text-slate-350">
              {item.priorityLabel}
            </span>
            {item.dueDate && (
              <span className="text-[8px] sm:text-[9px] font-semibold text-slate-500 flex items-center gap-0.5">
                <Calendar className="h-3 w-3" />
                Due: {item.dueDate}
              </span>
            )}
            {item.type === 'reminder' && item.rawItem?.google_sync_enabled && (
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border flex items-center gap-0.5 ${
                item.rawItem.google_sync_status === 'synced'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-transparent'
                  : item.rawItem.google_sync_status === 'failed'
                  ? 'bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/20 dark:text-rose-450 dark:border-transparent'
                  : 'bg-slate-50 text-slate-650 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-transparent'
              }`}>
                {item.rawItem.google_sync_status === 'synced' ? 'GCal' : item.rawItem.google_sync_status === 'failed' ? 'Failed' : 'Pending'}
              </span>
            )}
          </div>
          
          {item.type === 'reminder' ? (
            <button
              onClick={() => setActiveReminder(item.rawItem)}
              className="text-left focus:outline-none block w-full"
            >
              <h4 className="text-[11px] sm:text-xs font-bold text-slate-850 dark:text-slate-100 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors line-clamp-1 leading-snug">
                {item.title}
              </h4>
            </button>
          ) : (
            <Link href={item.link}>
              <h4 className="text-[11px] sm:text-xs font-bold text-slate-850 dark:text-slate-100 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors line-clamp-1 leading-snug">
                {item.title}
              </h4>
            </Link>
          )}
          <p className="text-[9px] sm:text-[10px] text-slate-500 leading-normal line-clamp-1 sm:line-clamp-2">
            {item.subtitle}
          </p>
        </div>

        <div className="flex gap-1.5 sm:gap-2 items-center justify-end shrink-0">
          {item.type === 'reminder' ? (
            <button
              onClick={() => handleMarkDone(item)}
              disabled={processingId === item.id}
              className="flex h-7 sm:h-8 w-7 sm:w-auto sm:px-3 items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-bold cursor-pointer disabled:opacity-50 transition-all shadow-sm shadow-indigo-600/10"
            >
              {processingId === item.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark Done</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-1 sm:gap-1.5">
              {item.rawItem.phone && (
                <a
                  href={`tel:${item.rawItem.phone}`}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-750 text-slate-655 dark:text-slate-355 transition-all"
                >
                  <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-650 dark:text-slate-400" />
                </a>
              )}
              {item.rawItem.line_id && (
                <a
                  href={`https://line.me/ti/p/~${item.rawItem.line_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-750 text-slate-655 dark:text-slate-355 transition-all"
                >
                  <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-655 dark:text-slate-400" />
                </a>
              )}
            </div>
          )}

          {item.type === 'reminder' ? (
            <button
              onClick={() => setActiveReminder(item.rawItem)}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all focus:outline-none"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          ) : (
            <Link
              href={item.link}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Dashboard
            {isScanning && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Here is a quick overview of urgent tasks and CRM statistics.</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/import"
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-sm"
          >
            <Camera className="h-4 w-4 text-indigo-500" />
            Import Screenshot
          </Link>
          <Link
            href="/customers/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10"
          >
            <UserPlus className="h-4 w-4" />
            Add Customer
          </Link>
        </div>
      </div>

      {/* Grid statistics metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100">{stats.customers}</p>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Total Customers</span>
          </div>
        </div>

        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100">{stats.policies}</p>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Active Policies</span>
          </div>
        </div>

        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100">{stats.reminders}</p>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Pending Reminders</span>
          </div>
        </div>

        <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-850 dark:text-slate-100">฿{stats.giftCosts.toLocaleString()}</p>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Gifts This Month</span>
          </div>
        </div>

      </div>

      {/* Urgent Action Items Priority List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Urgent Action Items (รายการความสำคัญเร่งด่วน)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Bubble ranking based on due dates, customer priority levels, and contacted histories.</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start md:self-auto shadow-inner border border-slate-200/40 dark:border-slate-700/50">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <ListTodo className="h-4 w-4" />
              <span>List (รายการ)</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Calendar (ปฏิทิน)</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm shadow-slate-900/10'
                : 'bg-slate-50 dark:bg-slate-850 text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/40'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeFilter === 'all'
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {actionItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('premium')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'premium'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/10'
                : 'bg-slate-50 dark:bg-slate-850 text-slate-655 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/40'
            }`}
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span>เบี้ยประกัน</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeFilter === 'premium'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100/60 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
            }`}>
              {premiumItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('appointment')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'appointment'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                : 'bg-slate-50 dark:bg-slate-850 text-slate-655 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/40'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span>การนัดหมายและอื่นๆ</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeFilter === 'appointment'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-100/60 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400'
            }`}>
              {appointmentItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('birthday')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeFilter === 'birthday'
                ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/10'
                : 'bg-slate-50 dark:bg-slate-850 text-slate-655 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/40'
            }`}
          >
            <Gift className="h-3.5 w-3.5 text-pink-500" />
            <span>วันเกิด</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
              activeFilter === 'birthday'
                ? 'bg-white/20 text-white'
                : 'bg-pink-100/60 dark:bg-pink-955/20 text-pink-600 dark:text-pink-400'
            }`}>
              {birthdayItems.length}
            </span>
          </button>
        </div>

        {viewMode === 'calendar' ? (
          <div className="space-y-6">
            {/* Month Navigation Header */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    const today = new Date()
                    setCurrentMonth(today)
                    setSelectedDate(today)
                  }}
                  className="px-2.5 py-1 text-[10px] font-extrabold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-indigo-650 dark:text-indigo-400 rounded-lg cursor-pointer transition-all shadow-sm"
                >
                  วันนี้
                </button>
              </div>
              
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-650 dark:text-slate-400 cursor-pointer transition-all shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-650 dark:text-slate-400 cursor-pointer transition-all shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-slate-200/60 dark:border-slate-800/50 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/10">
              {/* Days of Week Headers */}
              <div className="grid grid-cols-7 border-b border-slate-200/60 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-850/50">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
                  <div key={day} className="py-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-[1px] bg-slate-200/60 dark:bg-slate-800/40">
                {calendarWeeks.flatMap((week) =>
                  week.map((date) => {
                    const isCurrentMonth = isSameMonth(date, currentMonth)
                    const isTodayDate = isSameDay(date, new Date())
                    const isSelected = isSameDay(date, selectedDate)
                    const dayItems = getItemsForDate(date)

                    return (
                      <div
                        key={date.toString()}
                        onClick={() => setSelectedDate(date)}
                        className={`min-h-[75px] md:min-h-[95px] bg-white dark:bg-slate-900 p-1.5 flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-50/80 dark:hover:bg-slate-850/40 select-none relative ${
                          isSelected 
                            ? 'ring-2 ring-indigo-500/80 dark:ring-indigo-500/80 z-10 shadow-md' 
                            : ''
                        } ${!isCurrentMonth ? 'opacity-40 bg-slate-50/20 dark:bg-slate-950/20' : ''}`}
                      >
                        {/* Day Number and Today Indicator */}
                        <div className="flex justify-between items-start">
                          <span className={`text-[11px] font-bold ${
                            isTodayDate 
                              ? 'flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-600/20' 
                              : isSelected
                              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {format(date, 'd')}
                          </span>
                        </div>

                        {/* Day Items Display */}
                        <div className="mt-1 flex-1 flex flex-col justify-end w-full">
                          {/* Mobile Indicators: Dots */}
                          {dayItems.length > 0 && (
                            <div className="flex flex-wrap gap-1 md:hidden justify-center py-0.5">
                              {dayItems.slice(0, 3).map((item) => (
                                <div
                                  key={item.id}
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    item.level === 'critical'
                                      ? 'bg-rose-500'
                                      : item.level === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-500'
                                  }`}
                                />
                              ))}
                              {dayItems.length > 3 && (
                                <div className="text-[7px] font-bold text-slate-400 leading-none">
                                  +{dayItems.length - 3}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Desktop Indicators: Compact pills */}
                          {dayItems.length > 0 && (
                            <div className="hidden md:flex flex-col gap-1 w-full mt-1">
                              {dayItems.slice(0, 2).map((item) => {
                                let bgClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-900/30'
                                if (item.level === 'critical') bgClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 border-rose-100/50 dark:border-rose-900/30'
                                else if (item.level === 'warning') bgClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30'
                                
                                return (
                                  <div
                                    key={item.id}
                                    title={`${item.priorityLabel}: ${item.title}`}
                                    className={`text-[8px] font-semibold px-1 py-0.5 rounded truncate border text-left leading-normal w-full ${bgClass}`}
                                  >
                                    {item.title}
                                  </div>
                                )
                              })}
                              {dayItems.length > 2 && (
                                <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 text-center">
                                  + {dayItems.length - 2} รายการ
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Selected Date Detail List */}
            <div className="bg-slate-50/50 dark:bg-slate-950/10 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  รายการประจำวันที่ {selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200/60 dark:bg-slate-850 text-slate-600 dark:text-slate-400 rounded-md">
                  {getItemsForDate(selectedDate).length} รายการ
                </span>
              </div>
              
              {getItemsForDate(selectedDate).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  ไม่มีรายการความสำคัญเร่งด่วนในวันนี้ (เลือกวันอื่นที่มีจุดเครื่องหมายในปฏิทิน)
                </p>
              ) : (
                <div className="space-y-2">
                  {getItemsForDate(selectedDate).map((item) => renderRow(item))}
                </div>
              )}
            </div>
            
            {/* No Due Date Items */}
            {filteredItems.filter(item => !item.dueDate).length > 0 && (
              <div className="bg-slate-50/50 dark:bg-slate-950/10 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  รายการที่ไม่มีกำหนดวัน (เช่น ลูกค้า Watchlist / VIP ที่ไม่ได้ติดต่อนาน)
                </h3>
                <div className="space-y-2">
                  {filteredItems.filter(item => !item.dueDate).map((item) => renderRow(item))}
                </div>
              </div>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-100 dark:border-slate-850 rounded-2xl">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-850 dark:text-slate-200">You are all caught up!</h4>
            <p className="text-xs text-slate-500 mt-1">No pending items matching the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => renderRow(item))}
          </div>
        )}
      </div>

      {paymentReminder && paymentReminder.rawItem && (
        <PremiumPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setPaymentReminder(null)
          }}
          onConfirm={handleConfirmPayment}
          defaultAmount={paymentReminder.rawItem.policies?.premium_amount || 0}
          planName={paymentReminder.rawItem.policies?.plan_name || '—'}
          policyNumber={paymentReminder.rawItem.policies?.policy_number || ''}
          clientName={paymentReminder.rawItem.customers?.full_name || 'ลูกค้า'}
        />
      )}

      {activeReminder && (
        <ReminderModal
          reminder={activeReminder}
          onClose={() => setActiveReminder(null)}
          onSaved={() => {
            setActiveReminder(null)
            loadDashboardData()
          }}
        />
      )}
    </div>
  )
}
