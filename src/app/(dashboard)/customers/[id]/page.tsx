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
  Bell
} from 'lucide-react'

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
}

interface CustomerLevel {
  id: string
  name: string
  color: string | null
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
  const [personalNote, setPersonalNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function loadCustomerData() {
      try {
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
            .select('id, name, color')
            .eq('id', custData.customer_level_id)
            .single()
          
          setLevel(lvlData)
        }

        // 3. Fetch customer policies
        const { data: polsData, error: polsErr } = await supabase
          .from('policies')
          .select('id, policy_number, company, plan_name, premium_amount, next_premium_due_date, policy_status')
          .eq('customer_id', id)

        if (polsErr) throw polsErr
        setPolicies(polsData || [])
      } catch (err: any) {
        console.error('Error fetching details:', err)
        setError(err.message || 'Failed to fetch customer details.')
      } finally {
        setLoading(false)
      }
    }

    loadCustomerData()
  }, [id, supabase])

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="bg-rose-50 border border-rose-250 p-6 rounded-2xl max-w-lg mx-auto text-center space-y-4">
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header Back Link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/customers')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
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
            className="flex items-center gap-1 px-4 py-2 border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Customer Overview Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xl border border-indigo-100 dark:border-indigo-900/30">
            {customer.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
              {customer.full_name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase"
                style={{
                  backgroundColor: level?.color ? `${level.color}15` : '#6B728015',
                  color: level?.color || '#6B7280',
                  borderColor: level?.color ? `${level.color}30` : '#6B728030',
                }}
              >
                {level?.name || 'No Level'}
              </span>
              <span
                className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold border uppercase ${
                  customer.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : customer.status === 'inactive'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {customer.status}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Dial Contact Targets */}
        <div className="flex gap-2">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Call Phone"
            >
              <Phone className="h-5 w-5" />
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
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
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Line Chat"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>

      {/* Grid of Profile Details & Personal Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 md:col-span-1">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Contact Information
          </h3>

          <div className="space-y-3.5">
            <div className="flex gap-3">
              <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="block text-slate-400">Phone</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.phone || '—'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="block text-slate-400">Email</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block max-w-[200px]">{customer.email || '—'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <MessageCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="block text-slate-400">Line ID</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.line_id || '—'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="block text-slate-400">Birth Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.birth_date || '—'}</span>
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

        {/* Notes & Placeholder Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Note Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Personal Notes (บันทึกข้อมูลลูกค้า)
              </h3>
              <button
                onClick={saveNote}
                disabled={isSavingNote}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
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

          {/* Placeholders for Activities, Reminders, Gifts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs">
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wide">Reminders</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">0 Pending</span>
              </div>
            </div>

            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs">
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wide">Activities</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">0 Interactions</span>
              </div>
            </div>

            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                <Gift className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs">
                <span className="block text-slate-400 font-bold uppercase text-[9px] tracking-wide">Gifts Cost</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">฿0 Total</span>
              </div>
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {policy.policy_number}
                    </span>
                  </div>
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                    {policy.plan_name || 'Unnamed Plan'}
                  </span>
                  <div className="flex gap-2 text-[10px] text-slate-500">
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
              <p className="text-xs text-slate-500 leading-relaxed">
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
    </div>
  )
}
