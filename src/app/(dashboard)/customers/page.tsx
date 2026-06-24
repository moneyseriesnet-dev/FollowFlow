'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Users,
  Camera,
  UserPlus,
  Filter,
  Loader2,
  ChevronRight,
  SlidersHorizontal,
  X
} from 'lucide-react'

interface Customer {
  id: string
  full_name: string
  phone: string | null
  line_id: string | null
  status: 'active' | 'inactive' | 'archived'
  updated_at: string
  customer_level_id: string | null
  customer_levels?: {
    name: string
    color: string | null
  } | null
}

interface CustomerLevel {
  id: string
  name: string
}

export default function CustomersPage() {
  const supabase = createClient() as any
  
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [levels, setLevels] = useState<CustomerLevel[]>([])
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch search/filters matching customers
  useEffect(() => {
    async function loadLevels() {
      const { data } = await supabase.from('customer_levels').select('id, name')
      if (data) setLevels(data)
    }
    loadLevels()
  }, [supabase])

  useEffect(() => {
    let active = true

    async function loadCustomers() {
      setLoading(true)
      try {
        let query = supabase
          .from('customers')
          .select('*, customer_levels(name, color)')
        
        // 1. Search filter
        if (searchQuery.trim()) {
          query = query.ilike('full_name', `%${searchQuery.trim()}%`)
        }

        // 2. Status filter
        if (selectedStatus !== 'all') {
          query = query.eq('status', selectedStatus)
        }

        // 3. Level filter
        if (selectedLevel !== 'all') {
          query = query.eq('customer_level_id', selectedLevel)
        }

        // 4. Sort recently updated
        query = query.order('updated_at', { ascending: false })

        const { data: custs, error: custsErr } = await query
        if (custsErr) throw custsErr

        let filteredCusts = custs || []

        // 5. Company filter (Filter client-side or fetch matching policy customers)
        if (selectedCompany !== 'all') {
          const { data: policies } = await supabase
            .from('policies')
            .select('customer_id')
            .eq('company', selectedCompany)

          const matchingCustomerIds = new Set((policies || []).map((p: any) => p.customer_id))
          filteredCusts = filteredCusts.filter((c: any) => matchingCustomerIds.has(c.id))
        }

        if (active) {
          setCustomers(filteredCusts)
        }
      } catch (err) {
        console.error('Error fetching customers:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    // Debounce search input
    const timer = setTimeout(() => {
      loadCustomers()
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery, selectedLevel, selectedStatus, selectedCompany, supabase])

  const clearFilters = () => {
    setSelectedLevel('all')
    setSelectedStatus('active')
    setSelectedCompany('all')
    setSearchQuery('')
  }

  const isFilterActive = selectedLevel !== 'all' || selectedStatus !== 'active' || selectedCompany !== 'all' || searchQuery !== ''

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Customers (รายชื่อลูกค้า)</h1>
          <p className="text-xs text-slate-500 mt-1">Manage profiles, contact information and levels.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/import"
            className="flex h-10 px-4 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
          >
            <Camera className="h-4 w-4 text-indigo-500" />
            <span className="hidden sm:inline">Import Screenshots</span>
          </Link>
          <Link
            href="/customers/new"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10 transition-transform active:scale-95"
            title="Add Customer"
          >
            <UserPlus className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Search and Filters Toggle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search customers by name..."
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

        {/* Expandable Filter Menu */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
              >
                <option value="all">All (ทุกสถานะ)</option>
                <option value="active">Active (ปกติ)</option>
                <option value="inactive">Inactive (ระงับ)</option>
                <option value="archived">Archived (เก็บถาวร)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Customer Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
              >
                <option value="all">All Levels</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Policy Company
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

      {/* Customer List Display */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Customers Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Try adjusting your filters or search keywords, or manually add a new customer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-800 flex justify-between items-center group transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase"
                    style={{
                      backgroundColor: customer.customer_levels?.color
                        ? `${customer.customer_levels.color}15`
                        : '#6B728015',
                      color: customer.customer_levels?.color || '#6B7280',
                      borderColor: customer.customer_levels?.color
                        ? `${customer.customer_levels.color}30`
                        : '#6B728030',
                    }}
                  >
                    {customer.customer_levels?.name || 'No Level'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                      customer.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {customer.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  {customer.full_name}
                </h3>
                <div className="flex gap-2 text-[10px] text-slate-500">
                  <span>Tel: {customer.phone || '—'}</span>
                  {customer.line_id && (
                    <>
                      <span>•</span>
                      <span>Line: {customer.line_id}</span>
                    </>
                  )}
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
