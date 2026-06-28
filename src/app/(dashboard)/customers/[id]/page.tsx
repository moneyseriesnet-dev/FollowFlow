'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Calendar,
  Layers,
  Heart,
  Save,
  Trash2,
  Edit2,
  Plus,
  FileText,
  AlertTriangle,
  ChevronRight,
  Shield,
  Gift,
  Bell,
  Clock,
  Sparkles,
  Users,
  CheckCircle,
  Copy,
  Crown,
  Star,
  Flame,
  Gem,
  TrendingUp,
  Award,
  Zap,
  User,
  Check,
  RotateCcw,
  Coins
} from 'lucide-react'

const AVAILABLE_ICONS = {
  Crown,
  Star,
  Flame,
  Sparkles,
  Heart,
  Shield,
  Gem,
  TrendingUp,
  Award,
  Zap,
  User,
  AlertTriangle
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  phone_call: 'โทรศัพท์',
  line_chat: 'ไลน์คุย',
  meeting: 'พบปะ',
  email: 'อีเมล',
  policy_delivery: 'ส่งมอบกรมธรรม์',
  claim_support: 'ช่วยเหลือเคลม',
  follow_up: 'ติดตามงาน',
  premium_payment: 'เก็บเบี้ยประกัน',
  other: 'อื่นๆ'
}

import ActivityForm from '@/components/activities/activity-form'
import GiftForm from '@/components/gifts/gift-form'
import ReminderModal from '@/components/reminders/reminder-modal'
import PremiumPaymentModal from '@/components/reminders/premium-payment-modal'
import { SwipeableList, type SwipeableListItem, type SwipeAction } from '@/components/ui/be-ui-swipeable-list'
import { completePremiumReminderWithPayment } from '@/lib/reminders/reminder-service'

interface Customer {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  line_id: string | null
  birth_date: string | null
  address: string | null
  customer_level_id: string | null
  status: 'active' | 'inactive' | 'archived' | null
  personal_note: string | null
  created_at: string | null
  ai_summary: string | null
  ai_suggested_level_id: string | null
  ai_suggested_level_reason: string | null
  ai_suggested_actions: {
    recommendedActions?: string[]
    draftMessage?: string
  } | null
  ai_last_generated_at: string | null
  needs_special_follow_up: boolean | null
}

interface CustomerLevel {
  id: string
  name: string
  color: string | null
  icon: string | null
}

interface Policy {
  id: string
  policy_number: string
  company: 'AXA' | 'AIA' | 'OTHER'
  plan_name: string | null
  premium_amount: number | null
  next_premium_due_date: string | null
  policy_status: 'active' | 'lapsed' | 'cancelled' | 'matured' | 'pending'
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient() as any

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [level, setLevel] = useState<CustomerLevel | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [gifts, setGifts] = useState<any[]>([])
  const [levelsList, setLevelsList] = useState<CustomerLevel[]>([])

  const [personalNote, setPersonalNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reminderTab, setReminderTab] = useState<'pending' | 'completed'>('pending')
  const [showLevelDropdown, setShowLevelDropdown] = useState(false)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentReminder, setPaymentReminder] = useState<any>(null)
  const [paymentPolicy, setPaymentPolicy] = useState<Policy | null>(null)

  // AI states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [copied, setCopied] = useState(false)

  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches)
    }
  }, [])

  // Modals / forms state
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [hideGiftOptionInForm, setHideGiftOptionInForm] = useState(false)
  const [aiActiveTab, setAiActiveTab] = useState<'overview' | 'chat'>('overview')
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([])
  const [isSendingChat, setIsSendingChat] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [showActivityDropdown, setShowActivityDropdown] = useState(false)
  const [defaultActivityType, setDefaultActivityType] = useState<string | undefined>(undefined)
  const [defaultActivitySummary, setDefaultActivitySummary] = useState<string | undefined>(undefined)
  const [showGiftForm, setShowGiftForm] = useState(false)
  const [selectedGift, setSelectedGift] = useState<any>(null)
  const [activeReminder, setActiveReminder] = useState<any>(null)

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const loadAllData = async () => {
    try {
      setError(null)
      // 1. Fetch customer
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (custErr) throw custErr
      if (!custData) {
        setError('Customer not found')
        return
      }

      setCustomer(custData)
      setPersonalNote(custData.personal_note || '')

      // 2. Fetch customer level details if level id exists
      if (custData.customer_level_id) {
        const { data: lvlData } = await supabase
          .from('customer_levels')
          .select('id, name, color, icon')
          .eq('id', custData.customer_level_id)
          .single()
        
        setLevel(lvlData)
      } else {
        setLevel(null)
      }

      // 3. Fetch customer policies
      const { data: polsData, error: polsErr } = await supabase
        .from('policies')
        .select('id, policy_number, company, plan_name, premium_amount, next_premium_due_date, policy_status')
        .eq('customer_id', id)

      if (polsErr) throw polsErr
      setPolicies(polsData || [])

      // 4. Fetch customer reminders
      const { data: remsData, error: remsErr } = await supabase
        .from('reminders')
        .select('*')
        .eq('customer_id', id)
        .order('due_date', { ascending: true })

      if (remsErr) throw remsErr
      setReminders(remsData || [])

      // 5. Fetch activities
      const { data: actsData, error: actsErr } = await supabase
        .from('activities')
        .select('*')
        .eq('customer_id', id)
        .order('activity_date', { ascending: false })

      if (actsErr) throw actsErr
      setActivities(actsData || [])

      // 6. Fetch gifts
      const { data: giftsData, error: giftsErr } = await supabase
        .from('gifts')
        .select('*')
        .eq('customer_id', id)
        .order('gift_date', { ascending: false })

      if (giftsErr) throw giftsErr
      setGifts(giftsData || [])

      // 7. Fetch all levels
      const { data: lvlsData } = await supabase
        .from('customer_levels')
        .select('id, name, color, icon')
      setLevelsList(lvlsData || [])

    } catch (err: any) {
      console.error('Error fetching details:', err)
      setError(err.message || 'Failed to fetch customer details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadAllData()
    }
  }, [id])

  const saveNote = async () => {
    setIsSavingNote(true)
    try {
      const { error: noteErr } = await supabase
        .from('customers')
        .update({ personal_note: personalNote.trim() || null })
        .eq('id', id)

      if (noteErr) throw noteErr
    } catch (err: any) {
      alert(err.message || 'Failed to save note')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { error: delErr } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (delErr) throw delErr
      router.push('/customers')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer.')
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleDeleteActivity = async (actId: string) => {
    if (!confirm('Are you sure you want to delete this activity log?')) return
    try {
      const { error: delErr } = await supabase
        .from('activities')
        .delete()
        .eq('id', actId)

      if (delErr) throw delErr
      loadAllData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete activity log')
    }
  }

  const handleDeleteGift = async (gId: string) => {
    if (!confirm('Are you sure you want to delete this gift record?')) return
    try {
      const { error: delErr } = await supabase
        .from('gifts')
        .delete()
        .eq('id', gId)

      if (delErr) throw delErr
      loadAllData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete gift record')
    }
  }

  const handleReminderAction = async (remId: string, newStatus: string) => {
    try {
      if (remId.startsWith('activity-')) {
        const actId = remId.replace('activity-', '')
        const updateData = newStatus === 'done'
          ? { next_action_status: 'done', next_action_completed_at: new Date().toISOString() }
          : { next_action_status: 'pending', next_action_completed_at: null }
        const { error: actErr } = await supabase
          .from('activities')
          .update(updateData)
          .eq('id', actId)

        if (actErr) throw actErr
        loadAllData()
        return
      }

      if (remId.startsWith('gift-')) {
        const gId = remId.replace('gift-', '')
        const currentTodayStr = new Date().toISOString().split('T')[0]
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const newGiftDate = newStatus === 'done'
          ? currentTodayStr
          : tomorrow.toISOString().split('T')[0]
        const { error: giftErr } = await supabase
          .from('gifts')
          .update({ gift_date: newGiftDate })
          .eq('id', gId)

        if (giftErr) throw giftErr
        loadAllData()
        return
      }

      // If premium_due reminder is marked done, redirect to payment modal
      const rawReminder = reminders.find(r => r.id === remId)
      if (rawReminder && rawReminder.reminder_type === 'premium_due' && rawReminder.policy_id && newStatus === 'done') {
        const associatedPolicy = policies.find(p => p.id === rawReminder.policy_id)
        setPaymentReminder(rawReminder)
        setPaymentPolicy(associatedPolicy || null)
        setPaymentModalOpen(true)
        return
      }

      const updateData: any = { status: newStatus }
      if (newStatus === 'done') {
        updateData.completed_at = new Date().toISOString()
      }
      
      const { error: remErr } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', remId)

      if (remErr) throw remErr
      
      // Trigger calendar sync
      fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: remId }),
      }).catch((err) => console.error('Failed to trigger calendar sync on action:', err))

      loadAllData()
    } catch (err: any) {
      alert(err.message || 'Failed to update reminder status')
    }
  }

  const handleConfirmPayment = async (amountPaid: number, paymentDate: string) => {
    if (!paymentReminder) return
    try {
      await completePremiumReminderWithPayment(supabase, {
        policyId: paymentReminder.policy_id!,
        reminderId: paymentReminder.id,
        customerId: id,
        amountPaid: amountPaid,
        paymentDate: paymentDate,
      })

      // Trigger calendar sync
      fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId: paymentReminder.id }),
      }).catch((err) => console.error('Failed to trigger calendar sync on action:', err))

      loadAllData()
    } catch (err: any) {
      console.error('Error completing payment:', err)
      throw err
    } finally {
      setPaymentReminder(null)
      setPaymentPolicy(null)
    }
  }

  // SUGGESTION ALGORITHM
  const todayStr = new Date().toISOString().split('T')[0]
  const premiumDueReminders = reminders.filter(r => r.reminder_type === 'premium_due')
  const snoozedCount = premiumDueReminders.filter(r => r.status === 'snoozed').length
  const overdueCount = premiumDueReminders.filter(r => 
    (r.status === 'pending' || r.status === 'snoozed') && r.due_date < todayStr
  ).length

  const qualifiesForWatchlist = snoozedCount >= 3 || overdueCount >= 1
  const isAlreadyWatchlist = level?.name?.toLowerCase().includes('watchlist')

  const assignToWatchlist = async () => {
    setIsUpdatingLevel(true)
    try {
      let watchlistLevel = levelsList.find(l => l.name.toLowerCase().includes('watchlist'))
      
      if (!watchlistLevel) {
        // Create the Watchlist level automatically
        const { data: { user } } = await supabase.auth.getUser()
        const { data: newLvl, error: newLvlErr } = await supabase
          .from('customer_levels')
          .insert({
            owner_id: user.id,
            name: 'Watchlist',
            description: 'Auto-recommended for customers with overdue premium payments',
            color: '#ef4444', // Red
          })
          .select()
          .single()
        
        if (newLvlErr) throw newLvlErr
        watchlistLevel = newLvl
      }

      if (!watchlistLevel) {
        throw new Error('Watchlist level could not be created or found.')
      }

      const { error: updateErr } = await supabase
        .from('customers')
        .update({ customer_level_id: watchlistLevel.id })
        .eq('id', id)

      if (updateErr) throw updateErr
      
      loadAllData()
    } catch (err: any) {
      alert(err.message || 'Failed to assign level')
    } finally {
      setIsUpdatingLevel(false)
    }
  }

  const handleGenerateAI = async () => {
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: id }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate AI analysis')
      }
      await loadAllData()
    } catch (err: any) {
      alert(err.message || 'Error running AI analysis.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApplySuggestedLevel = async () => {
    if (!customer || !customer.ai_suggested_level_id) return
    setIsUpdatingLevel(true)
    try {
      const { error: updateErr } = await supabase
        .from('customers')
        .update({ customer_level_id: customer.ai_suggested_level_id })
        .eq('id', id)

      if (updateErr) throw updateErr
      await loadAllData()
    } catch (err: any) {
      alert(err.message || 'Failed to update level')
    } finally {
      setIsUpdatingLevel(false)
    }
  }

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendChatMessage = async (customMessage?: string) => {
    const textToSend = customMessage || chatMessage
    if (!textToSend.trim() || isSendingChat) return

    const userMessage = { role: 'user' as const, text: textToSend }
    setChatHistory(prev => [...prev, userMessage])
    if (!customMessage) {
      setChatMessage('')
    }
    setIsSendingChat(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: id,
          message: textToSend,
          history: chatHistory
        })
      })
      const data = await res.json()
      if (data.error) {
        setChatHistory(prev => [...prev, { role: 'model', text: `เกิดข้อผิดพลาด: ${data.error}` }])
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: data.reply }])
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' }])
    } finally {
      setIsSendingChat(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'phone_call':
        return <Phone className="h-4 w-4" />
      case 'line_chat':
        return <MessageCircle className="h-4 w-4" />
      case 'meeting':
        return <Users className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'policy_delivery':
        return <Shield className="h-4 w-4" />
      case 'claim_support':
        return <Heart className="h-4 w-4" />
      case 'follow_up':
        return <Calendar className="h-4 w-4" />
      case 'premium_payment':
        return <Coins className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'phone_call':
        return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400'
      case 'line_chat':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
      case 'meeting':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400'
      case 'email':
        return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400'
      case 'policy_delivery':
        return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400'
      case 'claim_support':
        return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
      case 'premium_payment':
        return 'bg-amber-50 text-amber-650 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
      default:
        return 'bg-slate-50 text-slate-650 border-slate-100 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl max-w-lg mx-auto text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Error Loading Customer</h3>
        <p className="text-sm text-slate-500">{error || 'Unable to retrieve record.'}</p>
        <button
          onClick={() => router.push('/customers')}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          Back to Customers
        </button>
      </div>
    )
  }

  const getDaysDifference = (dueDateStr: string) => {
    if (!dueDateStr) return 0
    const today = new Date(todayStr)
    const due = new Date(dueDateStr)
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    return Math.round(diffTime / (1000 * 60 * 60 * 24))
  }

  const pendingReminders = (() => {
    const allPending = reminders.filter(r => {
      if (r.status !== 'pending' && r.status !== 'snoozed') return false
      return getDaysDifference(r.due_date) <= 30
    })

    // Add virtual activity reminders
    activities.forEach(act => {
      if (act.next_action_date && act.next_action_status !== 'done') {
        const daysDiff = getDaysDifference(act.next_action_date)
        if (daysDiff <= 30) {
          const typeLabel = ACTIVITY_TYPE_LABELS[act.activity_type] || act.activity_type
          allPending.push({
            id: `activity-${act.id}`,
            customer_id: act.customer_id,
            policy_id: act.policy_id || null,
            reminder_type: 'follow_up',
            title: `ติดตาม: ${typeLabel}`,
            description: act.summary || 'กำหนดติดตามงานถัดไป',
            due_date: act.next_action_date,
            status: 'pending',
            priority: 'normal',
            source_id: act.id
          })
        }
      }
    })

    // Add virtual gift reminders
    gifts.forEach(g => {
      if (g.gift_date) {
        const daysDiff = getDaysDifference(g.gift_date)
        if (daysDiff > 0 && daysDiff <= 30) {
          allPending.push({
            id: `gift-${g.id}`,
            customer_id: g.customer_id,
            policy_id: null,
            reminder_type: 'general',
            title: `ส่งมอบของขวัญ: ${g.gift_name}`,
            description: g.note || 'เตรียมส่งมอบของขวัญ',
            due_date: g.gift_date,
            status: 'pending',
            priority: 'normal',
            source_id: g.id
          })
        }
      }
    })

    const seen = new Map<string, (typeof allPending)[0]>()
    for (const rem of allPending) {
      if (rem.id.startsWith('activity-') || rem.id.startsWith('gift-')) {
        seen.set(rem.id, rem)
        continue
      }
      const key = rem.reminder_type === 'premium_due' && rem.policy_id
        ? `${rem.reminder_type}:${rem.policy_id}`
        : rem.reminder_type
      const existing = seen.get(key)
      if (!existing || rem.due_date > existing.due_date) {
        seen.set(key, rem)
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.due_date.localeCompare(b.due_date))
  })()

  const getDaysBadge = (dueDateStr: string) => {
    const diffDays = getDaysDifference(dueDateStr)
    if (diffDays === 0) {
      return {
        value: 'Today',
        label: 'Due',
        style: 'bg-amber-500/10 border-amber-250/30 text-amber-705 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400'
      }
    }
    if (diffDays > 0) {
      return {
        value: diffDays.toString(),
        label: diffDays === 1 ? 'day left' : 'days left',
        style: 'bg-indigo-500/10 border-indigo-200/30 text-indigo-705 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400'
      }
    }
    return {
      value: Math.abs(diffDays).toString(),
      label: Math.abs(diffDays) === 1 ? 'day late' : 'days late',
      style: 'bg-red-500/10 border-red-200/30 text-red-705 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
    }
  }

  const completedReminders = (() => {
    const allCompleted = reminders.filter(r => r.status === 'done')

    // Add virtual completed activity reminders
    activities.forEach(act => {
      if (act.next_action_date && act.next_action_status === 'done') {
        const typeLabel = ACTIVITY_TYPE_LABELS[act.activity_type] || act.activity_type
        allCompleted.push({
          id: `activity-${act.id}`,
          customer_id: act.customer_id,
          policy_id: act.policy_id || null,
          reminder_type: 'follow_up',
          title: `ติดตามแล้ว: ${typeLabel}`,
          description: act.summary || 'ติดตามงานเสร็จสิ้น',
          due_date: act.next_action_date,
          completed_at: act.next_action_completed_at || act.next_action_date + 'T12:00:00.000Z',
          status: 'done',
          priority: 'normal',
          source_id: act.id
        })
      }
    })

    // Add virtual completed gift reminders
    gifts.forEach(g => {
      if (g.gift_date) {
        const daysDiff = getDaysDifference(g.gift_date)
        if (daysDiff <= 0 && daysDiff >= -30) {
          allCompleted.push({
            id: `gift-${g.id}`,
            customer_id: g.customer_id,
            policy_id: null,
            reminder_type: 'general',
            title: `ส่งมอบแล้ว: ${g.gift_name}`,
            description: g.note || 'ส่งมอบของขวัญเรียบร้อยแล้ว',
            due_date: g.gift_date,
            completed_at: g.gift_date + 'T12:00:00.000Z',
            status: 'done',
            priority: 'normal',
            source_id: g.id
          })
        }
      }
    })

    return allCompleted.sort((a, b) => {
      const dateA = a.completed_at || a.due_date || ''
      const dateB = b.completed_at || b.due_date || ''
      return dateB.localeCompare(dateA)
    })
  })()
  
  const totalGiftsCost = gifts.reduce((acc, curr) => acc + (Number(curr.gift_cost) || 0), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header Back Link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/customers')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-850"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </button>

        <div className="flex items-center gap-2">
          <Link
            href={`/customers/${id}/edit`}
            className="flex items-center gap-1 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit Profile
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1 px-4 py-2 border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-655 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Suggestion Banner */}
      {qualifiesForWatchlist && !isAlreadyWatchlist && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-rose-600/15 border border-rose-250 dark:border-rose-900/40 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-455 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-950 dark:text-slate-100 flex items-center gap-1">
                Risk Warning: Payment Issues detected!
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Customer has {overdueCount} overdue premium payment(s) and {snoozedCount} snoozed reminder(s). Recommending level: <strong className="text-rose-600">Watchlist</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={assignToWatchlist}
            disabled={isUpdatingLevel}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold shadow-sm shrink-0 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isUpdatingLevel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Assign Watchlist
          </button>
        </div>
      )}

      {/* Customer Overview Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 font-bold text-xl border border-indigo-100 dark:border-indigo-900/30">
            {customer.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                {customer.full_name}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <button
                  onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                  style={{
                    backgroundColor: level?.color ? `${level.color}15` : '#6B728015',
                    color: level?.color || '#6B7280',
                    borderColor: level?.color ? `${level.color}30` : '#6B728030',
                  }}
                  title="Click to change customer level"
                >
                  {(() => {
                    if (!level) return null
                    const IconComponent = AVAILABLE_ICONS[level.icon as keyof typeof AVAILABLE_ICONS]
                    return IconComponent ? <IconComponent className="h-3 w-3" /> : null
                  })()}
                  {level?.name || 'No Level'}
                  <svg className="h-2.5 w-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>

                {showLevelDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowLevelDropdown(false)}
                    />
                    <div className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-20 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <p className="px-3 py-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        เปลี่ยนระดับลูกค้า
                      </p>
                      {levelsList.map((lvl) => {
                        const LvlIcon = AVAILABLE_ICONS[lvl.icon as keyof typeof AVAILABLE_ICONS]
                        const isActive = lvl.id === customer.customer_level_id
                        return (
                          <button
                            key={lvl.id}
                            onClick={async () => {
                              setShowLevelDropdown(false)
                              if (isActive) return
                              setIsUpdatingLevel(true)
                              try {
                                const { error: updateErr } = await supabase
                                  .from('customers')
                                  .update({ customer_level_id: lvl.id })
                                  .eq('id', id)
                                if (updateErr) throw updateErr
                                await loadAllData()
                              } catch (err: any) {
                                alert(err.message || 'Failed to update level')
                              } finally {
                                setIsUpdatingLevel(false)
                              }
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                              style={{
                                backgroundColor: lvl.color ? `${lvl.color}20` : '#6B728020',
                                color: lvl.color || '#6B7280',
                              }}
                            >
                              {LvlIcon ? <LvlIcon className="h-3 w-3" /> : null}
                            </span>
                            <span>{lvl.name}</span>
                            {isActive && (
                              <svg className="ml-auto h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            )}
                          </button>
                        )
                      })}
                      {levelsList.length === 0 && (
                        <p className="px-3 py-3 text-[11px] text-slate-400 text-center">ยังไม่มีระดับที่ตั้งค่าไว้</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <span
                className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold border uppercase ${
                  customer.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : customer.status === 'inactive'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-655 border-slate-200'
                }`}
              >
                {customer.status}
              </span>
            </div>
          </div>
        </div>

                {/* Actions & Contacts */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowActivityDropdown(!showActivityDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>บันทึกกิจกรรม (Log Activity)</span>
            </button>
            {showActivityDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowActivityDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-xl border border-slate-200 dark:border-slate-800 z-20 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="px-3 py-2 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60 pb-1 mb-1">
                    Quick Add Activity (บันทึกกิจกรรมด่วน)
                  </div>
                  <button
                    onClick={() => {
                      setDefaultActivityType('meeting')
                      setDefaultActivitySummary('เยี่ยมลูกค้า')
                      setHideGiftOptionInForm(true)
                      setShowActivityForm(true)
                      setShowActivityDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <span className="text-base shrink-0">👥</span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">เยี่ยมลูกค้า</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Log client visit meeting</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setDefaultActivityType('meeting')
                      setDefaultActivitySummary('นัดวางแผนการเงินอัปเดต')
                      setHideGiftOptionInForm(true)
                      setShowActivityForm(true)
                      setShowActivityDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <span className="text-base shrink-0">📅</span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">นัดวางแผน (อัปเดต)</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Log planning update meeting</div>
                    </div>
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-800/60 my-1 pt-1" />
                  <button
                    onClick={() => {
                      setSelectedActivity(null)
                      setDefaultActivityType(undefined)
                      setDefaultActivitySummary(undefined)
                      setHideGiftOptionInForm(false)
                      setShowActivityForm(true)
                      setShowActivityDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer text-indigo-650 dark:text-indigo-400 transition-colors font-semibold"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">บันทึกกิจกรรมทั่วไป...</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Open full activity logger</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Quick Dial Contact Targets */}
          <div className="flex gap-2">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 hover:text-indigo-650 transition-colors"
                title="Call Phone"
              >
                <Phone className="h-5 w-5" />
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 hover:text-indigo-655 transition-colors"
                title="Email Customer"
              >
                <Mail className="h-5 w-5" />
              </a>
            )}
            {customer.line_id && (
              <a
                href={`https://line.me/ti/p/~${customer.line_id}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 hover:text-indigo-655 transition-colors"
                title="Line Chat"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </div>

            {/* Grid of Profile Details & Personal Notes */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Column 1 (Left): Contact Info & Policies */}
        <div className="col-span-12 md:col-span-3 space-y-6">
          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Contact Information
            </h3>

            <div className="space-y-3.5">
              <div className="flex gap-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="block text-slate-400">Phone</span>
                  <span className="font-semibold text-slate-880 dark:text-slate-200">{customer.phone || '—'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="block text-slate-400">Email</span>
                  <span className="font-semibold text-slate-880 dark:text-slate-200 truncate block max-w-[200px]">{customer.email || '—'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <MessageCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="block text-slate-400">Line ID</span>
                  <span className="font-semibold text-slate-880 dark:text-slate-200">{customer.line_id || '—'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="block text-slate-400">Birth Date</span>
                  <span className="font-semibold text-slate-880 dark:text-slate-200">{customer.birth_date || '—'}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="block text-slate-400">Address</span>
                  <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{customer.address || 'No address logged'}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Policies Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Insurance Policies ({policies.length})
              </h3>
              <Link
                href={`/policies/new?customerId=${id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add Policy
              </Link>
            </div>

            {policies.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No policies associated with this customer.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {policies.map((policy) => (
                  <Link
                    key={policy.id}
                    href={`/policies/${policy.id}`}
                    className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-400 dark:hover:border-indigo-800 rounded-2xl flex items-center justify-between group transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold text-white ${
                            policy.company === 'AXA'
                              ? 'bg-blue-600'
                              : policy.company === 'AIA'
                              ? 'bg-rose-600'
                              : 'bg-slate-600'
                          }`}
                        >
                          {policy.company}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-855 dark:text-slate-200">
                          {policy.policy_number}
                        </span>
                      </div>
                      <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                        {policy.plan_name || 'Unnamed Plan'}
                      </span>
                      <div className="flex gap-2 text-[10px] text-slate-505">
                        <span>Premium: ฿{policy.premium_amount?.toLocaleString()}</span>
                        <span>•</span>
                        <span>Due: {policy.next_premium_due_date || '—'}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2 (Middle): Personal Notes & Logs */}
        <div className="col-span-12 md:col-span-5 space-y-6">
          {/* Note Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Personal Notes (บันทึกข้อมูลลูกค้า)
              </h3>
              <button
                onClick={saveNote}
                disabled={isSavingNote}
                className="flex items-center gap-1 text-xs font-bold text-indigo-655 hover:text-indigo-500 disabled:opacity-50"
              >
                {isSavingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
            <textarea
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Record personal preferences, relationship notes, or review summaries..."
              rows={4}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Statistics Metrics Cards */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => scrollToSection('reminders-section')}
              className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 flex items-center gap-3 text-left w-full hover:border-indigo-400 dark:hover:border-indigo-800 hover:shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs">
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wide">Reminders</span>
                <span className="font-semibold text-slate-850 dark:text-slate-200">{pendingReminders.length} Pending</span>
              </div>
            </button>

            <button
              onClick={() => scrollToSection('activities-section')}
              className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 flex items-center gap-3 text-left w-full hover:border-indigo-400 dark:hover:border-indigo-800 hover:shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-455 flex items-center justify-center shrink-0">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs">
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wide">Activities</span>
                <span className="font-semibold text-slate-855 dark:text-slate-200">{activities.length} Logs</span>
              </div>
            </button>

            
          </div>

          {/* Reminders List Section */}
          <div id="reminders-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 scroll-mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Reminders & Follow-Ups (งานที่ต้องติดตาม)
              </h3>
              
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Segmented Control Switch */}
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-[10px] font-bold shadow-xs">
                  <button
                    onClick={() => setReminderTab('pending')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      reminderTab === 'pending'
                        ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-405 shadow-xs'
                        : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Pending ({pendingReminders.length})
                  </button>
                  <button
                    onClick={() => setReminderTab('completed')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      reminderTab === 'completed'
                        ? 'bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-405 shadow-xs'
                        : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Completed ({completedReminders.length})
                  </button>
                </div>

                <Link
                  href={`/reminders/new?customerId=${id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-655 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Reminder
                </Link>
              </div>
            </div>

            {(() => {
              const activeList = reminderTab === 'pending' ? pendingReminders : completedReminders
              const noItemsText = reminderTab === 'pending'
                ? 'No pending reminders for this customer.'
                : 'No completed reminders for this customer.'

              if (activeList.length === 0) {
                return (
                  <div className="text-center py-8 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    <Bell className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-[11px] text-slate-500">{noItemsText}</p>
                  </div>
                )
              }

              const swipeableItems = activeList.map((rem) => {
                const isOverdue = rem.status !== 'done' && rem.due_date < todayStr
                const badge = getDaysBadge(rem.due_date)
                
                const leftActions: SwipeAction[] = isTouchDevice ? [
                  rem.status === 'done' ? {
                    id: 'pending',
                    label: 'Undo',
                    icon: <RotateCcw className="h-4 w-4" />,
                    tone: 'neutral'
                  } : {
                    id: 'done',
                    label: 'Done',
                    icon: <Check className="h-4 w-4" />,
                    tone: 'success'
                  }
                ] : []

                const rightActions: SwipeAction[] = isTouchDevice ? [
                  {
                    id: 'edit',
                    label: 'Edit',
                    icon: <Edit2 className="h-4 w-4" />,
                    tone: 'primary'
                  }
                ] : []

                const itemClass = rem.status === 'done'
                  ? 'bg-emerald-500/[0.02] border-emerald-100/50 dark:bg-emerald-950/[0.03] dark:border-emerald-900/10 text-slate-450 dark:text-slate-500 shadow-none'
                  : isOverdue
                  ? 'bg-rose-50/40 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30'
                  : rem.status === 'snoozed'
                  ? 'bg-amber-50/30 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/20'
                  : 'bg-slate-50/50 border-slate-100 dark:bg-slate-900/30'

                return {
                  id: rem.id,
                  leftActions,
                  rightActions,
                  className: itemClass,
                  content: (
                    <div className="flex items-center justify-between gap-4 w-full select-none">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {rem.status !== 'done' && (
                          <div className={`flex flex-col items-center justify-center shrink-0 w-16 h-12 rounded-2xl border text-center font-sans shadow-xs ${badge.style}`}>
                            <span className="text-[13px] font-extrabold leading-none tracking-tight">
                              {badge.value}
                            </span>
                            <span className="text-[7px] font-bold uppercase tracking-wider mt-0.5 leading-none font-medium">
                              {badge.label}
                            </span>
                          </div>
                        )}

                        <div className="space-y-1 select-none flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                rem.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : rem.priority === 'urgent' || rem.priority === 'high'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                  : 'bg-slate-105 text-slate-655 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {rem.status === 'done' ? 'done' : rem.priority}
                            </span>
                            <span className={`font-bold text-slate-855 dark:text-slate-200 ${rem.status === 'done' ? 'line-through text-slate-450 dark:text-slate-500' : ''}`}>
                              {rem.title}
                            </span>
                          </div>
                          <p className={`text-[11px] text-slate-500 leading-normal max-w-[400px] ${rem.status === 'done' ? 'line-through text-slate-400/80 dark:text-slate-655' : ''}`}>
                            {rem.description || 'No description provided.'}
                          </p>
                          <div className="flex gap-2 text-[10px] text-slate-400 font-medium">
                            {rem.status === 'done' ? (
                              <span className="text-emerald-600 dark:text-emerald-455 font-semibold">
                                Completed: {rem.completed_at ? new Date(rem.completed_at).toLocaleDateString('th-TH') : rem.due_date}
                              </span>
                            ) : (
                              <span className={isOverdue ? 'text-rose-600 dark:text-rose-455 font-bold' : ''}>
                                Due: {rem.due_date} {isOverdue && '(Overdue)'}
                              </span>
                            )}
                            {rem.next_action_date && rem.status !== 'done' && (
                              <span>• Next action: {rem.next_action_date}</span>
                            )}
                            {rem.google_sync_enabled && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border inline-block ml-1.5 ${
                                rem.google_sync_status === 'synced'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-455 dark:border-transparent'
                                  : rem.google_sync_status === 'failed'
                                  ? 'bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/20 dark:text-rose-455 dark:border-transparent'
                                  : 'bg-slate-50 text-slate-655 border-slate-205 dark:bg-slate-800 dark:text-slate-400 dark:border-transparent'
                              }`}>
                                {rem.google_sync_status === 'synced' ? 'GCal Synced' : rem.google_sync_status === 'failed' ? 'GCal Failed' : 'GCal Pending'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desktop Direct Actions (Non-touch) */}
                      {!isTouchDevice && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {rem.status === 'done' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReminderAction(rem.id, 'pending')
                              }}
                              className="p-1.5 rounded-lg text-emerald-605 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-slate-105 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                              title="Mark Pending"
                            >
                              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReminderAction(rem.id, 'done')
                              }}
                              className="p-1.5 rounded-lg text-emerald-606 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer"
                              title="Mark Done"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (rem.id.startsWith('activity-')) {
                                const act = activities.find(a => a.id === rem.source_id)
                                if (act) {
                                  setSelectedActivity(act)
                                  setShowActivityForm(true)
                                }
                              } else if (rem.id.startsWith('gift-')) {
                                const g = gifts.find(gift => gift.id === rem.source_id)
                                if (g) {
                                  setSelectedGift(g)
                                  setShowGiftForm(true)
                                }
                              } else {
                                setActiveReminder(rem)
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 bg-slate-105 dark:bg-slate-800 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Edit / Snooze"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }
              })

              return (
                <div className="max-h-[380px] overflow-y-auto pr-1">
                  <SwipeableList
                    items={swipeableItems}
                    dragDisabled={!isTouchDevice}
                    onAction={({ item, action }) => {
                      if (action.id === 'done') {
                        handleReminderAction(item.id, 'done')
                      } else if (action.id === 'pending') {
                        handleReminderAction(item.id, 'pending')
                      } else if (action.id === 'edit') {
                        if (item.id.startsWith('activity-')) {
                          const act = activities.find(a => a.id === item.id.replace('activity-', ''))
                          if (act) {
                            setSelectedActivity(act)
                            setShowActivityForm(true)
                          }
                        } else if (item.id.startsWith('gift-')) {
                          const g = gifts.find(gift => gift.id === item.id.replace('gift-', ''))
                          if (g) {
                            setSelectedGift(g)
                            setShowGiftForm(true)
                          }
                        } else {
                          const rem = reminders.find(r => r.id === item.id)
                          if (rem) {
                            setActiveReminder(rem)
                          }
                        }
                      }
                    }}
                  />
                </div>
              )
            })()}
          </div>

          {/* Double Column for Activities and Gifts logs */}
          {/* Activities Timeline Log */}
            <div id="activities-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 scroll-mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="h-4 w-4" /> Activity History ({activities.length})
                </h3>
                <button
                  onClick={() => {
                    setSelectedActivity(null)
                    setDefaultActivityType(undefined)
                    setDefaultActivitySummary(undefined)
                    setShowActivityForm(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-655 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Log
                </button>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  <Clock className="h-6 w-6 text-slate-350 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No activities logged yet.</p>
                </div>
              ) : (
                (() => {
                  const activitySwipeableItems = activities.map((act) => {
                    const dateStr = new Date(act.activity_date).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                    const leftActions: SwipeAction[] = isTouchDevice ? [
                      {
                        id: 'edit',
                        label: 'Edit',
                        icon: <Edit2 className="h-4 w-4" />,
                        tone: 'primary'
                      }
                    ] : []

                    const rightActions: SwipeAction[] = isTouchDevice ? [
                      {
                        id: 'delete',
                        label: 'Delete',
                        icon: <Trash2 className="h-4 w-4" />,
                        tone: 'danger'
                      }
                    ] : []

                    return {
                      id: act.id,
                      leftActions,
                      rightActions,
                      className: 'bg-slate-50/50 border-slate-100 dark:bg-slate-900/30',
                      content: (
                        <div className="flex items-center justify-between gap-4 w-full select-none">
                          <div className="relative text-xs space-y-1 w-full pl-6 select-none">
                            {/* Circle Bullet */}
                            <div
                              className={`absolute left-0 top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[9px] ${getActivityColor(
                                act.activity_type
                              )}`}
                            >
                              {getActivityIcon(act.activity_type)}
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-855 dark:text-slate-200 capitalize">
                                {act.activity_type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                            </div>
                            
                            {act.summary && (
                              <p className="text-slate-655 dark:text-slate-300 leading-normal pl-0.5 mt-0.5 font-medium font-sans">
                                {act.summary}
                              </p>
                            )}
                            {act.result && (
                              <p className="text-emerald-600 dark:text-emerald-450 leading-normal pl-0.5 text-[11px] font-semibold">
                                Result: {act.result}
                              </p>
                            )}
                            {act.status_after_activity && (
                              <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-105 dark:bg-slate-850 rounded text-[9px] font-bold text-slate-500">
                                {act.status_after_activity}
                              </span>
                            )}
                          </div>

                          {/* Desktop Direct Actions (Non-touch) */}
                          {!isTouchDevice && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedActivity(act)
                                  setShowActivityForm(true)
                                }}
                                className="p-1.5 rounded-lg text-slate-500 bg-slate-105 dark:bg-slate-800 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteActivity(act.id)
                                }}
                                className="p-1.5 rounded-lg text-rose-600 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 hover:text-rose-750 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    }
                  })

                  return (
                    <div className="max-h-[380px] overflow-y-auto pr-1">
                      <SwipeableList
                        items={activitySwipeableItems}
                        dragDisabled={!isTouchDevice}
                        onAction={({ item, action }) => {
                          if (action.id === 'edit') {
                            const act = activities.find(a => a.id === item.id)
                            if (act) {
                              setSelectedActivity(act)
                              setShowActivityForm(true)
                            }
                          } else if (action.id === 'delete') {
                            handleDeleteActivity(item.id)
                          }
                        }}
                      />
                    </div>
                  )
                })()
              )}
            </div>
        </div>

        {/* Column 3 (Right): AI Relationship Assistant */}
        <div className="col-span-12 md:col-span-4 space-y-6">
          
          {/* AI Relationship Assistant */}
          <div className="bg-gradient-to-br from-indigo-500/[0.03] to-purple-500/[0.03] dark:from-indigo-950/10 dark:to-purple-950/10 border border-indigo-150/80 dark:border-indigo-900/30 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col gap-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-655 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5 drop-shadow-[0_0_4px_rgba(99,102,241,0.4)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    AI Relationship Assistant
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    ผู้ช่วยวิเคราะห์ข้อมูลและความสัมพันธ์ลูกค้า
                  </p>
                </div>
              </div>
              
              {/* Tabs Switcher */}
              <div className="flex border-b border-slate-100 dark:border-slate-800/60 p-0.5 bg-slate-100/60 dark:bg-slate-950/40 rounded-xl text-[10px] font-bold">
                <button
                  onClick={() => setAiActiveTab('overview')}
                  className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                    aiActiveTab === 'overview'
                      ? 'bg-white dark:bg-slate-900 text-indigo-655 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  สรุปภาพรวม (Overview)
                </button>
                <button
                  onClick={() => setAiActiveTab('chat')}
                  className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                    aiActiveTab === 'chat'
                      ? 'bg-white dark:bg-slate-900 text-indigo-655 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  คุยกับ AI (Chat)
                </button>
              </div>
            </div>

            {aiActiveTab === 'overview' && (
              <div className="space-y-4">
                {!customer.ai_last_generated_at ? (
                  <div className="text-center py-6 px-4 bg-white/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-indigo-100 dark:border-indigo-900/20 space-y-3">
                    <Sparkles className="h-8 w-8 text-indigo-400/80 mx-auto animate-pulse" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-880 dark:text-slate-200">ยังไม่ได้เปิดใช้งานการวิเคราะห์ข้อมูลความสัมพันธ์</h4>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                        ใช้ AI ประเมินประวัติ ความต้องการความคุ้มครอง และความเสี่ยงในการจ่ายเบี้ย เพื่อรับคำแนะนำระดับ สรุปพฤติกรรม และร่างข้อความสำหรับติดตามลูกค้าทันที
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateAI}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5 w-full justify-center"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> เริ่มวิเคราะห์ลูกค้ารายนี้
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                {/* 1. Relationship Summary */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    สรุปผลการวิเคราะห์ความคุ้มครองและความสัมพันธ์
                  </h4>
                  <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-350 leading-relaxed shadow-sm">
                    {customer.ai_summary}
                  </div>
                </div>

                {/* 2. Level Recommendation Banner */}
                {customer.ai_suggested_level_id && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      ระดับที่แนะนำ
                    </h4>
                    
                    {customer.ai_suggested_level_id !== customer.customer_level_id ? (
                      <div className="p-4 bg-amber-500/5 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20 rounded-2xl flex flex-col justify-between gap-3 shadow-sm">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                              แนะนำให้อัปเดตระดับเป็น:
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
                              style={{
                                color: levelsList.find(l => l.id === customer.ai_suggested_level_id)?.color || undefined,
                                borderColor: levelsList.find(l => l.id === customer.ai_suggested_level_id)?.color ? `${levelsList.find(l => l.id === customer.ai_suggested_level_id)?.color}40` : undefined,
                                backgroundColor: levelsList.find(l => l.id === customer.ai_suggested_level_id)?.color ? `${levelsList.find(l => l.id === customer.ai_suggested_level_id)?.color}10` : undefined,
                              }}
                            >
                              {levelsList.find(l => l.id === customer.ai_suggested_level_id)?.name || 'Unknown'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-505 dark:text-slate-455 leading-relaxed font-medium">
                            {customer.ai_suggested_level_reason}
                          </p>
                        </div>
                        
                        <button
                          onClick={handleApplySuggestedLevel}
                          disabled={isUpdatingLevel}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-extrabold shadow-sm flex items-center justify-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdatingLevel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          ปรับใช้ระดับนี้
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-2xl flex items-center gap-2 shadow-sm">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-455 shrink-0" />
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">
                          ระดับปัจจุบันตรงตามคำแนะนำของ AI แล้ว ({levelsList.find(l => l.id === customer.customer_level_id)?.name})
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Special Attention Required Badge */}
                {customer.needs_special_follow_up && (
                  <div className="p-3.5 bg-red-500/5 dark:bg-red-950/15 border border-red-200/50 dark:border-red-900/30 rounded-2xl flex items-center gap-2 shadow-sm">
                    <AlertTriangle className="h-4 w-4 text-red-655 dark:text-red-400 shrink-0" />
                    <p className="text-[11px] text-red-800 dark:text-red-400 font-bold">
                      ต้องได้รับการดูแลชำระเบี้ยพิเศษ: ตรวจพบประวัติเลื่อนจ่ายหรือเบี้ยค้างชำระกรุณาติดตามความสัมพันธ์ด่วน
                    </p>
                  </div>
                )}

                {/* Last generated timestamp */}
                {customer.ai_last_generated_at && (
                  <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium border-t border-slate-100 dark:border-slate-800/60 pt-3.5 mt-2">
                    <button
                      onClick={handleGenerateAI}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 text-indigo-650 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer font-bold transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      วิเคราะห์ใหม่ (Refresh)
                    </button>
                    <span>
                      วิเคราะห์เมื่อ: {new Date(customer.ai_last_generated_at).toLocaleString('th-TH')}
                    </span>
                  </div>
                )}
                  </div>
                )}
              </div>
            )}

            {aiActiveTab === 'chat' && (
              <div className="flex flex-col h-[400px] bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-800 p-3.5 space-y-3.5 overflow-hidden">
                {/* Message list container */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
                  {/* AI initial message */}
                  <div className="flex flex-col gap-1.5 bg-slate-100/70 dark:bg-slate-800/40 p-3 rounded-2xl rounded-tl-none border border-slate-100/50 dark:border-slate-800/30 text-slate-700 dark:text-slate-350">
                    <p className="font-bold text-slate-900 dark:text-white">
                      สวัสดีครับ! ผมเป็นผู้ช่วย AI ของคุณสำหรับดูแลคุณ {customer.full_name} 
                    </p>
                    <p>ต้องการทราบประวัติการติดต่อ กรมธรรม์ หรือสถานะงานติดตามเรื่องไหน สอบถามได้เลยครับ เช่น:</p>
                    
                    {/* Suggestion Chips */}
                    <div className="flex flex-col gap-1.5 mt-2">
                      <button
                        onClick={() => handleSendChatMessage('ลูกค้ามีประวัติกิจกรรมอะไรบ้าง? ทำช่วงไหน?')}
                        className="text-left px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-200 hover:text-indigo-650 cursor-pointer transition-all text-[11px] font-medium text-slate-800 dark:text-slate-200"
                      >
                        💡 ลูกค้ามีประวัติกิจกรรมอะไรบ้าง?
                      </button>
                      <button
                        onClick={() => handleSendChatMessage('ขอรายละเอียดและกำหนดชำระเบี้ยของกรมธรรม์ของลูกค้ารายนี้')}
                        className="text-left px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-200 hover:text-indigo-650 cursor-pointer transition-all text-[11px] font-medium text-slate-800 dark:text-slate-200"
                      >
                        💡 กรมธรรม์และกำหนดชำระเบี้ยถัดไปคือเมื่อไหร่?
                      </button>
                      <button
                        onClick={() => handleSendChatMessage('ลูกค้าคนนี้มีสิทธิประโยชน์หรือระดับความสัมพันธ์ปัจจุบันอย่างไร?')}
                        className="text-left px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-200 hover:text-indigo-650 cursor-pointer transition-all text-[11px] font-medium text-slate-800 dark:text-slate-200"
                      >
                        💡 ภาพรวมและคำแนะนำระดับลูกค้าในตอนนี้คืออะไร?
                      </button>
                    </div>
                  </div>

                  {/* Render conversation history */}
                  {chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-[11px] font-medium leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-2xs border border-slate-150 dark:border-slate-800/60'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isSendingChat && (
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium pl-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                      <span className="text-[10px] animate-pulse">กำลังประมวลผลคำตอบ...</span>
                    </div>
                  )}
                </div>

                {/* Input box */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSendChatMessage()
                      }
                    }}
                    placeholder="พิมพ์คำถามเกี่ยวกับลูกค้า..."
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                    disabled={isSendingChat}
                  />
                  <button
                    onClick={() => handleSendChatMessage()}
                    disabled={isSendingChat || !chatMessage.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0"
                  >
                    ส่ง
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Customer</h3>
              <p className="text-xs text-slate-550 leading-relaxed">
                Are you sure you want to delete <strong>{customer.full_name}</strong>? This will permanently delete all policies and notes, and cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Logger Popup */}
      {showActivityForm && (
        <ActivityForm
          customerId={id}
          activity={selectedActivity}
          defaultType={defaultActivityType}
          defaultSummary={defaultActivitySummary}
          hideGiftOption={hideGiftOptionInForm}
          onClose={() => {
            setShowActivityForm(false)
            setSelectedActivity(null)
            setDefaultActivityType(undefined)
            setDefaultActivitySummary(undefined)
            setHideGiftOptionInForm(false)
          }}
          onSaved={loadAllData}
        />
      )}

      {/* Gift Logger Popup */}
      {showGiftForm && (
        <GiftForm
          customerId={id}
          gift={selectedGift}
          onClose={() => {
            setShowGiftForm(false)
            setSelectedGift(null)
          }}
          onSaved={loadAllData}
        />
      )}

      {/* Reminder Editor Modal */}
      {activeReminder && (
        <ReminderModal
          reminder={activeReminder}
          onClose={() => setActiveReminder(null)}
          onSaved={loadAllData}
        />
      )}

      {/* Premium Payment Confirmation Modal */}
      {paymentReminder && (
        <PremiumPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setPaymentReminder(null)
            setPaymentPolicy(null)
          }}
          onConfirm={handleConfirmPayment}
          defaultAmount={paymentPolicy?.premium_amount || 0}
          planName={paymentPolicy?.plan_name || '—'}
          policyNumber={paymentPolicy?.policy_number || ''}
          clientName={customer.full_name || 'ลูกค้า'}
        />
      )}
    </div>
  )
}
