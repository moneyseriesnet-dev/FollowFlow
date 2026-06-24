'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { scanAndGenerateAllReminders, rolloverPolicyCycle } from '@/lib/reminders/reminder-service'
import {
  Users,
  FileText,
  Bell,
  Gift,
  Camera,
  UserPlus,
  Loader2,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Calendar,
  CheckCircle,
  Phone,
  MessageCircle
} from 'lucide-react'
import { differenceInDays, parseISO, format, subDays } from 'date-fns'

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
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient() as any

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

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Run self-healing reminder scanning in background
        setIsScanning(true)
        try {
          await scanAndGenerateAllReminders(supabase, user.id)
        } catch (err) {
          console.error('Scanning error:', err)
        } finally {
          setIsScanning(false)
        }

        // 2. Fetch statistics counts
        const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('owner_id', user.id)
        const { count: polCount } = await supabase.from('policies').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('policy_status', 'active')
        const { count: remCount } = await supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('status', 'pending')
        
        // Sum gifts cost this month
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        const { data: gifts } = await supabase
          .from('gifts')
          .select('gift_cost')
          .eq('owner_id', user.id)
          .gte('gift_date', startOfMonth)

        const totalGiftsSum = (gifts || []).reduce((acc: number, curr: any) => acc + Number(curr.gift_cost || 0), 0)

        setStats({
          customers: custCount || 0,
          policies: polCount || 0,
          reminders: remCount || 0,
          giftCosts: totalGiftsSum
        })

        // 3. Retrieve raw records to calculate the 10-level priority action items
        const { data: pendingReminders } = await supabase
          .from('reminders')
          .select('*, customers(full_name, customer_levels(name)), policies(id, policy_number, plan_name, company, payment_frequency)')
          .eq('owner_id', user.id)
          .eq('status', 'pending')

        const { data: allCustomers } = await supabase
          .from('customers')
          .select('*, customer_levels(name, color)')
          .eq('owner_id', user.id)
          .eq('status', 'active')

        // Compute items
        const items: PriorityActionItem[] = []
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]

        // Map Pending Reminders
        if (pendingReminders) {
          pendingReminders.forEach((rem: any) => {
            const due = parseISO(rem.due_date)
            const daysDiff = differenceInDays(due, today)
            
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
                link: `/customers/${rem.customer_id}`,
                rawItem: rem
              })
              return
            }

            // Priority 2: Premium due within 1–3 days
            if (rem.reminder_type === 'premium_due' && daysDiff >= 0 && daysDiff <= 3) {
              items.push({
                id: rem.id,
                type: 'reminder',
                priorityRank: 2,
                priorityLabel: '🟠 Premium Due 1-3 Days',
                title: rem.title,
                subtitle: rem.description || '',
                dueDate: rem.due_date,
                level: 'critical',
                link: `/policies/${rem.policy_id}`,
                rawItem: rem
              })
              return
            }

            // Priority 3: Premium due within 7 days
            if (rem.reminder_type === 'premium_due' && daysDiff > 3 && daysDiff <= 7) {
              items.push({
                id: rem.id,
                type: 'reminder',
                priorityRank: 3,
                priorityLabel: '🟡 Premium Due 7 Days',
                title: rem.title,
                subtitle: rem.description || '',
                dueDate: rem.due_date,
                level: 'warning',
                link: `/policies/${rem.policy_id}`,
                rawItem: rem
              })
              return
            }

            // Priority 5: Premium due within 14 days
            if (rem.reminder_type === 'premium_due' && daysDiff > 7 && daysDiff <= 14) {
              items.push({
                id: rem.id,
                type: 'reminder',
                priorityRank: 5,
                priorityLabel: '🔵 Premium Due 14 Days',
                title: rem.title,
                subtitle: rem.description || '',
                dueDate: rem.due_date,
                level: 'info',
                link: `/policies/${rem.policy_id}`,
                rawItem: rem
              })
              return
            }

            // Priority 6: Premium due within 30 days
            if (rem.reminder_type === 'premium_due' && daysDiff > 14 && daysDiff <= 30) {
              items.push({
                id: rem.id,
                type: 'reminder',
                priorityRank: 6,
                priorityLabel: '🔵 Premium Due 30 Days',
                title: rem.title,
                subtitle: rem.description || '',
                dueDate: rem.due_date,
                level: 'info',
                link: `/policies/${rem.policy_id}`,
                rawItem: rem
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
                rawItem: rem
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
                rawItem: rem
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
                rawItem: rem
              })
              return
            }
          })
        }

        // Map Customer Priorities
        if (allCustomers) {
          allCustomers.forEach((cust: any) => {
            const levelName = cust.customer_levels?.name || ''
            
            // Priority 4: Special-follow-up (Watchlist) with pending tasks
            if (levelName === 'Watchlist') {
              const hasPendingReminders = pendingReminders?.some((r: any) => r.customer_id === cust.id)
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

            // Priority 10: VIP customers not contacted recently (last contact > 3 months ago)
            if (levelName === 'VIP') {
              const lastContact = cust.last_contact_date ? parseISO(cust.last_contact_date) : null
              const daysSinceContact = lastContact ? differenceInDays(today, lastContact) : 999
              if (daysSinceContact > 90) {
                items.push({
                  id: `vip-idle-${cust.id}`,
                  type: 'customer_vip',
                  priorityRank: 10,
                  priorityLabel: '💎 VIP Idle Contact',
                  title: `ติดต่อคุณ ${cust.full_name} (ลูกค้า VIP)`,
                  subtitle: `ไม่มีประวัติการติดต่อในรอบ 3 เดือนที่ผ่านมา (ล่าสุด ${cust.last_contact_date ? cust.last_contact_date.split('T')[0] : 'ไม่ระบุ'})`,
                  dueDate: null,
                  level: 'info',
                  link: `/customers/${cust.id}`,
                  rawItem: cust
                })
              }
            }
          })
        }

        // Sort items by priority rank ascending
        items.sort((a, b) => a.priorityRank - b.priorityRank)
        setActionItems(items)

      } catch (err) {
        console.error('Error fetching dashboard records:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [supabase])

  const handleMarkDone = async (item: PriorityActionItem) => {
    if (item.type !== 'reminder') return
    
    setProcessingId(item.id)
    try {
      const rem = item.rawItem
      if (rem.reminder_type === 'premium_due' && rem.policy_id) {
        // Roll over policy premium cycle
        await rolloverPolicyCycle(supabase, rem.policy_id, rem.id)
      } else {
        // Simple update status to done
        await supabase
          .from('reminders')
          .update({ status: 'done', completed_at: new Date().toISOString() })
          .eq('id', rem.id)
      }

      // Remove from view
      setActionItems((prev) => prev.filter((i) => i.id !== item.id))
      setStats((prev) => ({ ...prev, reminders: Math.max(0, prev.reminders - 1) }))
    } catch (err) {
      console.error('Error resolving action item:', err)
    } finally {
      setProcessingId(null)
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Urgent Action Items (รายการความสำคัญเร่งด่วน)
          </h2>
          <p className="text-xs text-slate-500 mt-1">Bubble ranking based on due dates, customer priority levels, and contacted histories.</p>
        </div>

        {actionItems.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-100 dark:border-slate-850 rounded-2xl">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-850 dark:text-slate-200">You are all caught up!</h4>
            <p className="text-xs text-slate-500 mt-1">No urgent pending items requiring immediate attention.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md ${getUrgencyClasses(item.level)}`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-bold tracking-wider uppercase bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-300">
                      {item.priorityLabel}
                    </span>
                    {item.dueDate && (
                      <span className="text-[9px] font-semibold text-slate-500 flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />
                        Due: {item.dueDate}
                      </span>
                    )}
                  </div>
                  
                  <Link href={item.link}>
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">
                      {item.title}
                    </h4>
                  </Link>
                  <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>

                <div className="flex gap-2 items-center justify-end shrink-0">
                  {item.type === 'reminder' ? (
                    <button
                      onClick={() => handleMarkDone(item)}
                      disabled={processingId === item.id}
                      className="flex h-9 px-4 items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {processingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Mark Done
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      {item.rawItem.phone && (
                        <a
                          href={`tel:${item.rawItem.phone}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {item.rawItem.line_id && (
                        <a
                          href={`https://line.me/ti/p/~${item.rawItem.line_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}

                  <Link
                    href={item.link}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
