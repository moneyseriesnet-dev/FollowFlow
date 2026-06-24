'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  ArrowLeft,
  FileText,
  User,
  Shield,
  Calendar,
  DollarSign,
  Heart,
  Save,
  Trash2,
  Edit2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react'

interface Policy {
  id: string
  customer_id: string
  company: 'AXA' | 'AIA' | 'OTHER'
  policy_number: string
  insured_name: string | null
  payer_name: string | null
  plan_name: string | null
  sum_assured: number | null
  premium_amount: number | null
  payment_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  policy_start_date: string | null
  next_premium_due_date: string | null
  policy_status: 'active' | 'lapsed' | 'cancelled' | 'matured' | 'pending'
  policy_note: string | null
  source: 'manual' | 'ocr_import'
  created_at: string | null
}

interface CustomerLookup {
  id: string
  full_name: string
}

export default function PolicyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient() as any

  const [loading, setLoading] = useState(true)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [customer, setCustomer] = useState<CustomerLookup | null>(null)
  const [policyNote, setPolicyNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function loadPolicyData() {
      try {
        // 1. Fetch policy
        const { data: polData, error: polErr } = await supabase
          .from('policies')
          .select('*')
          .eq('id', id)
          .single()

        if (polErr) throw polErr
        if (!polData) {
          setError('Policy not found')
          return
        }

        setPolicy(polData)
        setPolicyNote(polData.policy_note || '')

        // 2. Fetch associated customer name
        const { data: custData, error: custErr } = await supabase
          .from('customers')
          .select('id, full_name')
          .eq('id', polData.customer_id)
          .single()

        if (custErr) throw custErr
        setCustomer(custData)
      } catch (err: any) {
        console.error('Error fetching policy details:', err)
        setError(err.message || 'Failed to fetch policy details.')
      } finally {
        setLoading(false)
      }
    }

    loadPolicyData()
  }, [id, supabase])

  const saveNote = async () => {
    setIsSavingNote(true)
    try {
      const { error: noteErr } = await supabase
        .from('policies')
        .update({ policy_note: policyNote.trim() || null })
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
        .from('policies')
        .delete()
        .eq('id', id)

      if (delErr) throw delErr
      
      // Redirect back to customer detail page if available, else policies list
      if (policy?.customer_id) {
        router.push(`/customers/${policy.customer_id}`)
      } else {
        router.push('/policies')
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete policy.')
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

  if (error || !policy) {
    return (
      <div className="bg-rose-50 border border-rose-250 p-6 rounded-2xl max-w-lg mx-auto text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Error Loading Policy</h3>
        <p className="text-sm text-slate-500">{error || 'Unable to retrieve record.'}</p>
        <button
          onClick={() => router.push('/policies')}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          Back to Policies
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          <Link
            href={`/policies/${id}/edit`}
            className="flex items-center gap-1 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit Policy
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1 px-4 py-2 border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Main Policy Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white font-bold text-base shadow-lg ${
            policy.company === 'AXA'
              ? 'bg-blue-600 shadow-blue-500/10'
              : policy.company === 'AIA'
              ? 'bg-rose-600 shadow-rose-500/10'
              : 'bg-slate-600 shadow-slate-500/10'
          }`}>
            {policy.company}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {policy.plan_name || 'Unnamed Insurance Plan'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs font-semibold text-slate-500">
                No. {policy.policy_number}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                  policy.policy_status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {policy.policy_status}
              </span>
              {policy.source === 'ocr_import' && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Sparkles className="h-2.5 w-2.5" /> OCR
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Financial Premium Highlights */}
        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 p-4 rounded-2xl min-w-[200px] text-center md:text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Premium ({policy.payment_frequency})</span>
          <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
            ฿{policy.premium_amount?.toLocaleString() || '0'}
          </p>
        </div>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Customer Lookup Link Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 md:col-span-1">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Policy Insured / Customer
          </h3>
          {customer ? (
            <Link
              href={`/customers/${customer.id}`}
              className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-400 dark:hover:border-indigo-800 rounded-2xl flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <span className="block text-slate-400">Customer</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                    {customer.full_name}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div className="text-slate-400 text-xs">Customer lookup missing.</div>
          )}

          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Insured Name:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{policy.insured_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payer Name:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{policy.payer_name || '—'}</span>
            </div>
          </div>
        </div>

        {/* Policy specifications & Notes */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm grid grid-cols-2 gap-4">
            
            <div className="flex gap-3">
              <DollarSign className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="block text-slate-400">Sum Assured (ทุนประกัน)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ฿{policy.sum_assured?.toLocaleString() || '—'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="block text-slate-400">Next Premium Due Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {policy.next_premium_due_date || '—'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Shield className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="block text-slate-400">Start Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{policy.policy_start_date || '—'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="block text-slate-400">Import Source</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{policy.source}</span>
              </div>
            </div>

          </div>

          {/* Policy Note Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Policy Notes & Riders (บันทึกสัญญาแนบท้าย)
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
              value={policyNote}
              onChange={(e) => setPolicyNote(e.target.value)}
              placeholder="Record rider benefits, term exclusions, or specific payment agreements..."
              rows={4}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Policy</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete policy <strong>{policy.policy_number}</strong>? This action cannot be undone.
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
