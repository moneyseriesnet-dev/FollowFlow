'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Search,
  Users,
  Camera,
  UserPlus,
  Loader2,
  ChevronRight,
  SlidersHorizontal,
  X,
  Pencil,
  Check,
  Phone,
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

interface Customer {
  id: string
  full_name: string
  phone: string | null
  line_id: string | null
  status: 'active' | 'inactive' | 'archived'
  updated_at: string
  created_at: string
  birth_date: string | null
  customer_level_id: string | null
  customer_levels?: {
    name: string
    color: string | null
    icon: string | null
  } | null
  policies?: {
    company: string
  }[]
}

interface CustomerLevel {
  id: string
  name: string
  color: string | null
  icon: string | null
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
  const [sortBy, setSortBy] = useState<'name_asc' | 'newest' | 'oldest'>('name_asc')

  // Inline Editing State
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBirthDate, setEditBirthDate] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLevelId, setEditLevelId] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Fetch customer levels
  useEffect(() => {
    async function loadLevels() {
      const { data } = await supabase.from('customer_levels').select('id, name, color, icon')
      if (data) setLevels(data)
    }
    loadLevels()
  }, [supabase])

  // Memoized load customers logic
  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('customers')
        .select('*, customer_levels!customers_customer_level_id_fkey(name, color, icon), policies(company)')
      
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

      // 4. Sort
      if (sortBy === 'name_asc') {
        query = query.order('full_name', { ascending: true })
      } else if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true })
      }

      const { data: custs, error: custsErr } = await query
      if (custsErr) throw custsErr

      let filteredCusts = custs || []

      // 5. Company filter
      if (selectedCompany !== 'all') {
        const { data: policies } = await supabase
          .from('policies')
          .select('customer_id')
          .eq('company', selectedCompany)

        const matchingCustomerIds = new Set((policies || []).map((p: any) => p.customer_id))
        filteredCusts = filteredCusts.filter((c: any) => matchingCustomerIds.has(c.id))
      }

      setCustomers(filteredCusts)
    } catch (err) {
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedLevel, selectedStatus, selectedCompany, sortBy, supabase])

  // Fetch search/filters matching customers (debounced search)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers()
    }, 200)

    return () => {
      clearTimeout(timer)
    }
  }, [loadCustomers])

  const clearFilters = () => {
    setSelectedLevel('all')
    setSelectedStatus('active')
    setSelectedCompany('all')
    setSearchQuery('')
  }

  const isFilterActive = selectedLevel !== 'all' || selectedStatus !== 'active' || selectedCompany !== 'all' || searchQuery !== ''

  // Inline edit handlers
  const startEdit = (customer: Customer) => {
    setEditingCustomerId(customer.id)
    setEditName(customer.full_name)
    setEditBirthDate(customer.birth_date || '')
    setEditPhone(customer.phone || '')
    setEditLevelId(customer.customer_level_id || '')
  }

  const handleSaveInline = async (customerId: string) => {
    if (!editName.trim()) return
    setSavingId(customerId)
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          full_name: editName.trim(),
          birth_date: editBirthDate || null,
          phone: editPhone.trim() || null,
          customer_level_id: editLevelId || null
        })
        .eq('id', customerId)

      if (error) throw error
      setEditingCustomerId(null)
      await loadCustomers()
    } catch (err) {
      console.error('Error saving customer inline:', err)
      alert('Failed to save customer details.')
    } finally {
      setSavingId(null)
    }
  }

  const formatBirthDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ค้นหาชื่อลูกค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Company Tabs/Buttons */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950">
              {(['all', 'AXA', 'AIA'] as const).map((company) => (
                <button
                  key={company}
                  onClick={() => setSelectedCompany(company)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedCompany === company
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-200/50 dark:border-slate-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {company === 'all' ? 'บริษัททั้งหมด' : company}
                </button>
              ))}
            </div>

            {/* Sorting Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="name_asc">เรียงตามตัวอักษร (ก-ฮ)</option>
              <option value="newest">เพิ่มเข้ามาใหม่สุด - เก่าสุด</option>
              <option value="oldest">เพิ่มเข้ามาเก่าสุด - ใหม่สุด</option>
            </select>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex h-11 px-4 items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                showFilters || selectedLevel !== 'all' || selectedStatus !== 'active'
                  ? 'border-indigo-200 bg-indigo-50/30 text-indigo-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">คัดกรองเพิ่มเติม</span>
            </button>
          </div>
        </div>

        {/* Expandable Filter Menu */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                สถานะการติดต่อ
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
              >
                <option value="all">ทั้งหมด (ทุกสถานะ)</option>
                <option value="active">ปกติ (Active)</option>
                <option value="inactive">Inactive (ระงับ)</option>
                <option value="archived">Archived (เก็บถาวร)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                ระดับลูกค้า (Customer Level)
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none"
              >
                <option value="all">ระดับทั้งหมด</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            {isFilterActive && (
              <div className="sm:col-span-2 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" /> ล้างตัวกรองทั้งหมด
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Table Display */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 mb-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">ไม่พบรายชื่อลูกค้า</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            ลองปรับเปลี่ยนตัวกรอง ค้นหาด้วยคำอื่น หรือสร้างรายชื่อลูกค้าใหม่
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/55 dark:bg-slate-900/50">
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-16 text-center">
                    ลำดับ
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    ชื่อ-นามสกุล
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    วันเกิด
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    เบอร์โทรศัพท์
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    สถานะลูกค้า
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    บริษัท
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-24 text-center">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((customer, index) => {
                  const isEditing = editingCustomerId === customer.id
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 text-center font-medium">
                        {index + 1}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-sm focus:border-indigo-500 focus:outline-none"
                            placeholder="ชื่อ-นามสกุล"
                          />
                        ) : (
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            {customer.full_name}
                          </Link>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editBirthDate}
                            onChange={(e) => setEditBirthDate(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        ) : (
                          formatBirthDate(customer.birth_date)
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-sm focus:border-indigo-500 focus:outline-none"
                            placeholder="เบอร์โทรศัพท์"
                          />
                        ) : customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-855 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline font-semibold"
                          >
                            <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            {customer.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {isEditing ? (
                          <select
                            value={editLevelId}
                            onChange={(e) => setEditLevelId(e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 text-xs focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="">ไม่มีระดับ</option>
                            {levels.map((lvl) => (
                              <option key={lvl.id} value={lvl.id}>
                                {lvl.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase"
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
                              {(() => {
                                if (!customer.customer_levels) return null
                                const IconComponent = AVAILABLE_ICONS[customer.customer_levels.icon as keyof typeof AVAILABLE_ICONS]
                                return IconComponent ? <IconComponent className="h-3 w-3" /> : null
                              })()}
                              {customer.customer_levels?.name || 'ไม่มีระดับ'}
                            </span>
                            {customer.status !== 'active' && (
                              <span
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border uppercase bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/20 dark:text-slate-400 dark:border-slate-800"
                              >
                                {customer.status}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {(() => {
                          const uniqueCompanies = Array.from(
                            new Set(customer.policies?.map((p) => p.company) || [])
                          )
                          return uniqueCompanies.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {uniqueCompanies.map((company) => {
                                if (company === 'AIA') {
                                  return (
                                    <span
                                      key={company}
                                      className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider shadow-sm"
                                    >
                                      AIA
                                    </span>
                                  )
                                }
                                if (company === 'AXA') {
                                  return (
                                    <span
                                      key={company}
                                      className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider shadow-sm"
                                    >
                                      AXA
                                    </span>
                                  )
                                }
                                return (
                                  <span
                                    key={company}
                                    className="px-2.5 py-1 bg-slate-500 text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider shadow-sm"
                                  >
                                    {company}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">—</span>
                          )
                        })()}
                      </td>
                      <td className="py-4 px-4 text-sm text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveInline(customer.id)}
                              disabled={savingId === customer.id}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50 cursor-pointer disabled:opacity-50 transition-colors"
                              title="บันทึก"
                            >
                              {savingId === customer.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingCustomerId(null)}
                              disabled={savingId === customer.id}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-50 transition-colors"
                              title="ยกเลิก"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => startEdit(customer)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer transition-colors"
                              title="แก้ไข"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
