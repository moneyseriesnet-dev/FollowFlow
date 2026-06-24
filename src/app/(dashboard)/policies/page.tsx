'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  FileText,
  Plus,
  Loader2,
  ChevronRight,
  SlidersHorizontal,
  X,
  Sparkles
} from 'lucide-react'

interface Policy {
  id: string
  policy_number: string
  company: 'AXA' | 'AIA' | 'OTHER'
  plan_name: string | null
  premium_amount: number | null
  next_premium_due_date: string | null
  policy_status: 'active' | 'lapsed' | 'cancelled' | 'matured' | 'pending'
  payment_frequency: string
  source: string
  customers: {
    full_name: string
  } | null
}

export default function PoliciesPage() {
  const supabase = createClient() as any

  const [loading, setLoading] = useState(true)
  const [policies, setPolicies] = useState<Policy[]>([])
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let active = true

    async function loadPolicies() {
      setLoading(true)
      try {
        let query = supabase
          .from('policies')
          .select('*, customers(full_name)')

        // 1. Search filter
        if (searchQuery.trim()) {
          query = query.or(`policy_number.ilike.%${searchQuery.trim()}%,plan_name.ilike.%${searchQuery.trim()}%`)
        }

        // 2. Company filter
        if (selectedCompany !== 'all') {
          query = query.eq('company', selectedCompany)
        }

        // 3. Frequency filter
        if (selectedFrequency !== 'all') {
          query = query.eq('payment_frequency', selectedFrequency)
        }

        // 4. Status filter
        if (selectedStatus !== 'all') {
          query = query.eq('policy_status', selectedStatus)
        }

        // 5. Sort by next premium due date (closest first)
        query = query.order('next_premium_due_date', { ascending: true, nullsFirst: false })

        const { data, error } = await query
        if (error) throw error

        if (active) {
          setPolicies(data || [])
        }
      } catch (err) {
        console.error('Error loading policies:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    // Debounce search input
    const timer = setTimeout(() => {
      loadPolicies()
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery, selectedCompany, selectedFrequency, selectedStatus, supabase])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCompany('all')
    setSelectedFrequency('all')
    setSelectedStatus('all')
  }

  const isFilterActive = searchQuery !== '' || selectedCompany !== 'all' || selectedFrequency !== 'all' || selectedStatus !== 'all'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Policies (รายชื่อกรมธรรม์)</h1>
          <p className="text-xs text-slate-500 mt-1">Track insurance policies, premiums, and due dates.</p>
        </div>
        <Link
          href="/policies/new"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10 transition-transform active:scale-95"
          title="Add Policy"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {/* Search and Filters Toggle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by policy number or plan name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-11 px-4 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showFilters || isFilterActive
                ? 'border-indigo-200 bg-indigo-50/30 text-indigo-600'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Company (บริษัท)
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
              >
                <option value="all">All Companies</option>
                <option value="AXA">AXA</option>
                <option value="AIA">AIA</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Frequency (งวดชำระ)
              </label>
              <select
                value={selectedFrequency}
                onChange={(e) => setSelectedFrequency(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
              >
                <option value="all">All Frequencies</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Status (สถานะ)
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (มีผลบังคับ)</option>
                <option value="pending">Pending (อยู่ระหว่างอนุมัติ)</option>
                <option value="lapsed">Lapsed (ขาดผลบังคับ)</option>
                <option value="cancelled">Cancelled (ยกเลิก)</option>
                <option value="matured">Matured (ครบกำหนด)</option>
              </select>
            </div>

            {isFilterActive && (
              <div className="sm:col-span-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" /> Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Policy list display */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : policies.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-4">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Policies Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Try adjusting your search query or filters, or add a new policy to a customer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {policies.map((policy) => (
            <Link
              key={policy.id}
              href={`/policies/${policy.id}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-800 flex justify-between items-center group transition-all"
            >
              <div className="space-y-2">
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
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100" title="OCR Source">
                      <Sparkles className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate max-w-[200px]">
                  {policy.plan_name || 'Unnamed Plan'}
                </h3>

                <div className="text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Client: {policy.customers?.full_name || '—'}
                  </span>
                </div>

                <div className="flex gap-2 text-[10px] text-slate-400">
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
  )
}
