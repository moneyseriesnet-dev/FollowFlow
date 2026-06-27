'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Gift as GiftIcon,
  TrendingUp,
  Plus,
  CalendarDays,
  Search,
  ChevronRight,
  TrendingDown,
  Layers,
  Building,
  Users,
  Loader2,
  Trash2,
  Edit2,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'
import GiftForm from '@/components/gifts/gift-form'

export default function GiftsPage() {
  const supabase = createClient() as any
  const [loading, setLoading] = useState(true)
  const [gifts, setGifts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [levels, setLevels] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState('')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics'>('logs')
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)
  
  // Gift creation popup state
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [showGiftForm, setShowGiftForm] = useState(false)
  const [editingGift, setEditingGift] = useState<any>(null)

  const loadData = async () => {
    try {
      setLoading(true)

      // Fetch all gifts
      const { data: giftsData } = await supabase
        .from('gifts')
        .select('*')
        .order('gift_date', { ascending: false })

      // Fetch all customers (needed for matching customer names and level IDs)
      const { data: custsData } = await supabase
        .from('customers')
        .select('id, full_name, customer_level_id')
        .order('full_name', { ascending: true })

      // Fetch all policies (needed for company mapping)
      const { data: polsData } = await supabase
        .from('policies')
        .select('id, customer_id, company')

      // Fetch all levels
      const { data: levelsData } = await supabase
        .from('customer_levels')
        .select('id, name, color')

      // Fetch all activities
      const { data: actsData } = await supabase
        .from('activities')
        .select('id, policy_id, activity_type, activity_date, summary')

      setGifts(giftsData || [])
      setCustomers(custsData || [])
      setPolicies(polsData || [])
      setLevels(levelsData || [])
      setActivities(actsData || [])

    } catch (err) {
      console.error('Failed to load reporting data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDeleteGift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gift record?')) return
    try {
      const { error } = await supabase.from('gifts').delete().eq('id', id)
      if (error) throw error
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete gift')
    }
  }

  // --- STATS COMPUTATIONS ---
  const today = new Date()
  const thisYear = today.getFullYear()
  const thisMonth = today.getMonth() // 0-indexed

  // Filter gifts by this month and this year
  const giftsThisMonth = gifts.filter((g) => {
    const d = new Date(g.gift_date)
    return d.getFullYear() === thisYear && d.getMonth() === thisMonth
  })

  const giftsThisYear = gifts.filter((g) => {
    const d = new Date(g.gift_date)
    return d.getFullYear() === thisYear
  })

  const totalCostMonth = giftsThisMonth.reduce((acc, curr) => acc + (Number(curr.gift_cost) || 0), 0)
  const totalCostYear = giftsThisYear.reduce((acc, curr) => acc + (Number(curr.gift_cost) || 0), 0)

  // Unique customers gifted this year
  const uniqueCustomersCount = new Set(giftsThisYear.map((g) => g.customer_id)).size

  // Average gift cost this month
  const avgCostMonth = giftsThisMonth.length > 0 ? totalCostMonth / giftsThisMonth.length : 0

  // Calculate monthly trend data for the current year
  const monthlyTrendData = Array.from({ length: 12 }, (_, i) => {
    const monthGifts = giftsThisYear.filter((g) => {
      const d = new Date(g.gift_date)
      return d.getMonth() === i
    })
    const total = monthGifts.reduce((acc, curr) => acc + (Number(curr.gift_cost) || 0), 0)
    return {
      monthIndex: i,
      monthName: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i],
      monthNameEn: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      total
    }
  })

  const maxMonthlyTotal = Math.max(...monthlyTrendData.map((d) => d.total), 1000)

  // --- REPORT BREAKDOWNS ---
  
  // 1. By Customer
  const customerBreakdown = customers.map((c) => {
    const customerGifts = gifts.filter((g) => g.customer_id === c.id)
    const totalCost = customerGifts.reduce((acc, curr) => acc + (Number(curr.gift_cost) || 0), 0)
    const levelObj = levels.find((l) => l.id === c.customer_level_id)
    
    return {
      id: c.id,
      name: c.full_name,
      level: levelObj?.name || 'No Level',
      levelColor: levelObj?.color || '#6B7280',
      totalCost,
      count: customerGifts.length
    }
  }).filter((item) => item.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

  // 2. By Customer Level
  const levelBreakdown = levels.map((l) => {
    // Find all customers belonging to this level
    const customerIdsInLevel = customers.filter((c) => c.customer_level_id === l.id).map((c) => c.id)
    const levelGifts = gifts.filter((g) => customerIdsInLevel.includes(g.customer_id))
    const totalCost = levelGifts.reduce((acc, curr) => acc + (Number(curr.gift_cost) || 0), 0)

    return {
      id: l.id,
      name: l.name,
      color: l.color || '#6B7280',
      totalCost,
      count: levelGifts.length
    }
  }).sort((a, b) => b.totalCost - a.totalCost)

  // Add a level breakdown for customers with "No Level"
  const customersWithNoLevelIds = customers.filter((c) => !c.customer_level_id).map((c) => c.id)
  const noLevelGifts = gifts.filter((g) => customersWithNoLevelIds.includes(g.customer_id))
  const noLevelCost = noLevelGifts.reduce((acc, curr) => acc + (Number(curr.gift_cost) || 0), 0)
  if (noLevelCost > 0) {
    levelBreakdown.push({
      id: 'no_level',
      name: 'Unassigned Level',
      color: '#94a3b8', // slate-400
      totalCost: noLevelCost,
      count: noLevelGifts.length
    })
  }

  // 3. By Insurance Company
  // Logic: For each gift, determine the company
  const companyCosts = {
    AXA: 0,
    AIA: 0,
    OTHER: 0,
    SHARED_OR_UNKNOWN: 0
  }

  gifts.forEach((g) => {
    const cost = Number(g.gift_cost) || 0
    
    // Check if the gift is linked to an activity that is linked to a policy
    if (g.activity_id) {
      const act = activities.find((a) => a.id === g.activity_id)
      if (act && act.policy_id) {
        const pol = policies.find((p) => p.id === act.policy_id)
        if (pol) {
          if (pol.company === 'AXA') companyCosts.AXA += cost
          else if (pol.company === 'AIA') companyCosts.AIA += cost
          else companyCosts.OTHER += cost
          return
        }
      }
    }

    // Default: Check customer's policy companies
    const custPolicies = policies.filter((p) => p.customer_id === g.customer_id)
    if (custPolicies.length === 0) {
      companyCosts.SHARED_OR_UNKNOWN += cost
    } else {
      const companies = Array.from(new Set(custPolicies.map((p) => p.company)))
      if (companies.length === 1) {
        const comp = companies[0]
        if (comp === 'AXA') companyCosts.AXA += cost
        else if (comp === 'AIA') companyCosts.AIA += cost
        else companyCosts.OTHER += cost
      } else {
        // If customer has both AXA and AIA, split it evenly
        const hasAxa = companies.includes('AXA')
        const hasAia = companies.includes('AIA')
        if (hasAxa && hasAia) {
          companyCosts.AXA += cost / 2
          companyCosts.AIA += cost / 2
        } else {
          companyCosts.SHARED_OR_UNKNOWN += cost
        }
      }
    }
  })

  const companyBreakdown = [
    { name: 'AXA policies', cost: companyCosts.AXA, color: 'bg-blue-600' },
    { name: 'AIA policies', cost: companyCosts.AIA, color: 'bg-rose-600' },
    { name: 'Other policies', cost: companyCosts.OTHER, color: 'bg-amber-600' },
    { name: 'Unlinked / General', cost: companyCosts.SHARED_OR_UNKNOWN, color: 'bg-slate-500' }
  ].filter((c) => c.cost > 0)

  // 4. By Activity Type
  const activityTypeNames: { [key: string]: string } = {
    phone_call: 'Phone Call (โทรศัพท์)',
    line_chat: 'Line Chat (ไลน์คุย)',
    meeting: 'Meeting (พบปะ)',
    email: 'Email (อีเมล)',
    policy_delivery: 'Policy Delivery (ส่งมอบกรมธรรม์)',
    claim_support: 'Claim Support (ช่วยเหลือเคลม)',
    follow_up: 'Follow Up (ติดตามงาน)',
    other: 'Other (อื่นๆ)'
  }

  const activityTypeCosts: { [key: string]: { cost: number; count: number } } = {
    phone_call: { cost: 0, count: 0 },
    line_chat: { cost: 0, count: 0 },
    meeting: { cost: 0, count: 0 },
    email: { cost: 0, count: 0 },
    policy_delivery: { cost: 0, count: 0 },
    claim_support: { cost: 0, count: 0 },
    follow_up: { cost: 0, count: 0 },
    other: { cost: 0, count: 0 }
  }

  let unlinkedCost = 0
  let unlinkedCount = 0

  gifts.forEach((g) => {
    const cost = Number(g.gift_cost) || 0
    if (g.activity_id) {
      const act = activities.find((a) => a.id === g.activity_id)
      if (act && act.activity_type && activityTypeCosts[act.activity_type]) {
        activityTypeCosts[act.activity_type].cost += cost
        activityTypeCosts[act.activity_type].count += 1
      } else {
        unlinkedCost += cost
        unlinkedCount += 1
      }
    } else {
      unlinkedCost += cost
      unlinkedCount += 1
    }
  })

  const activityBreakdown = Object.entries(activityTypeCosts)
    .map(([type, data]) => ({
      id: type,
      name: activityTypeNames[type] || type,
      totalCost: data.cost,
      count: data.count,
      color: type === 'meeting' ? 'bg-emerald-600' :
             type === 'policy_delivery' ? 'bg-indigo-650' :
             type === 'follow_up' ? 'bg-sky-500' :
             type === 'phone_call' ? 'bg-blue-600' :
             type === 'line_chat' ? 'bg-teal-500' :
             type === 'claim_support' ? 'bg-rose-500' : 'bg-slate-550'
    }))
    .filter((a) => a.totalCost > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

  if (unlinkedCost > 0) {
    activityBreakdown.push({
      id: 'unlinked',
      name: 'Direct Gift / General (ให้ของขวัญโดยตรง)',
      totalCost: unlinkedCost,
      count: unlinkedCount,
      color: 'bg-slate-400'
    })
  }

  // Filter logs list based on search
  const filteredGifts = gifts.filter((g) => {
    const cust = customers.find((c) => c.id === g.customer_id)
    const custName = cust?.full_name?.toLowerCase() || ''
    const giftName = g.gift_name?.toLowerCase() || ''
    const note = g.note?.toLowerCase() || ''
    const search = searchQuery.toLowerCase()

    return custName.includes(search) || giftName.includes(search) || note.includes(search)
  })

  // Filter customers for selection in the modal
  const filteredCustomersForSelect = customers.filter((c) => {
    return c.full_name?.toLowerCase().includes(customerSearchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
      </div>
    )
  }

  const currentMonthThai = today.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
            Gifts & Relationship Costs (ค่าของขวัญและงบดูแลลูกค้า)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Track and analyze client management expenses by level, company, and client
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedCustomerId('')
            setCustomerSearchQuery('')
            setShowCustomerSelectModal(true)
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white shadow-lg shadow-pink-500/25 transition-transform active:scale-95 cursor-pointer"
          title="Record New Gift"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Month Cost */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-50/50 dark:from-pink-950/20 dark:to-rose-950/5 border border-pink-100 dark:border-pink-900/30 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-pink-650 dark:text-pink-400 uppercase tracking-wide flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {currentMonthThai}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              ฿{totalCostMonth.toLocaleString()}
            </h2>
            <p className="text-[10px] text-slate-400">
              Avg. ฿{Math.round(avgCostMonth).toLocaleString()} per gift • {giftsThisMonth.length} items
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm shrink-0 border border-pink-100/50 dark:border-pink-900/10">
            <TrendingUp className="h-6 w-6 text-pink-650 dark:text-pink-400" />
          </div>
        </div>

        {/* Year Cost */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Annual Budget ({thisYear + 543})
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              ฿{totalCostYear.toLocaleString()}
            </h2>
            <p className="text-[10px] text-slate-400">
              Total expenses for this calendar year
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 border border-slate-100 dark:border-slate-800">
            <GiftIcon className="h-6 w-6 text-slate-650 dark:text-slate-450" />
          </div>
        </div>

        {/* Customers Count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Customers Gifted
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {uniqueCustomersCount} Customers
            </h2>
            <p className="text-[10px] text-slate-400">
              Unique recipients this year
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 border border-slate-100 dark:border-slate-800">
            <Users className="h-6 w-6 text-slate-650 dark:text-slate-450" />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 transition-colors ${
            activeTab === 'logs'
              ? 'border-b-2 border-indigo-650 text-indigo-650 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-850'
          }`}
        >
          All Gift Records ({filteredGifts.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 transition-colors ${
            activeTab === 'analytics'
              ? 'border-b-2 border-indigo-650 text-indigo-650 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-850'
          }`}
        >
          Analytics Breakdowns (สรุปแยกประเภท)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'logs' ? (
        <div className="space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search gifts by customer name, gift name, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
            />
          </div>

          {filteredGifts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-100 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
              <GiftIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No gifts matches</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No gift records match your search query. Try typing something else or log a new gift.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredGifts.map((g) => {
                  const cust = customers.find((c) => c.id === g.customer_id)
                  const dateStr = new Date(g.gift_date).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: '2-digit'
                  })

                  return (
                    <div
                      key={g.id}
                      className="p-4 flex items-center justify-between gap-4 text-xs group hover:bg-slate-50/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/customers/${g.customer_id}`}
                            className="font-bold text-slate-850 dark:text-slate-200 hover:text-indigo-650 hover:underline"
                          >
                            {cust?.full_name || 'Unknown Customer'}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {dateStr}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-650 dark:text-slate-350">
                          {g.gift_name}
                        </p>
                        {g.note && (
                          <p className="text-[11px] text-slate-500 leading-normal max-w-lg">
                            Note: {g.note}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-slate-900 dark:text-white">
                          ฿{g.gift_cost?.toLocaleString()}
                        </span>
                        
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedCustomerId(g.customer_id)
                              setEditingGift(g)
                              setShowGiftForm(true)
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGift(g.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-650 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        // ANALYTICS TAB CONTENT
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Trend Chart Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="h-4.5 w-4.5" /> Monthly Spending Trend (แนวโน้มค่าใช้จ่ายรายเดือน)
                </h3>
                <p className="text-[10px] text-slate-555 mt-0.5">
                  Monthly summary for the calendar year {thisYear + 543}
                </p>
              </div>
              
              {/* Dynamic Value Display */}
              <div className="text-right">
                {hoveredBarIndex !== null ? (
                  <>
                    <span className="text-[10px] font-bold text-pink-650 dark:text-pink-400 uppercase tracking-wider">
                      {monthlyTrendData[hoveredBarIndex].monthNameEn} ({monthlyTrendData[hoveredBarIndex].monthName})
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      ฿{monthlyTrendData[hoveredBarIndex].total.toLocaleString()}
                    </h4>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Annual Total ({thisYear + 543})
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      ฿{totalCostYear.toLocaleString()}
                    </h4>
                  </>
                )}
              </div>
            </div>

            {/* SVG Chart */}
            <div className="h-48 w-full flex items-center justify-center">
              <svg viewBox="0 0 600 210" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#db2777" />
                  </linearGradient>
                  <linearGradient id="hoverBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#be185d" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Gridlines & Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const yVal = 160 - ratio * 140
                  const labelVal = Math.round(ratio * maxMonthlyTotal)
                  return (
                    <g key={idx} className="opacity-40 dark:opacity-20">
                      <line
                        x1="45"
                        y1={yVal}
                        x2="580"
                        y2={yVal}
                        stroke="#cbd5e1"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x="35"
                        y={yVal + 3}
                        textAnchor="end"
                        className="fill-slate-400 dark:fill-slate-500 text-[9px] font-bold"
                      >
                        {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(0)}k` : labelVal}
                      </text>
                    </g>
                  )
                })}

                {/* Bars */}
                {monthlyTrendData.map((d, i) => {
                  const x = 55 + i * 44
                  const barHeight = (d.total / maxMonthlyTotal) * 140
                  const y = 160 - barHeight
                  const isHovered = hoveredBarIndex === i

                  return (
                    <g
                      key={i}
                      onMouseEnter={() => setHoveredBarIndex(i)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className="cursor-pointer group/bar"
                    >
                      {/* Transparent wider hover target rect */}
                      <rect
                        x={x - 12}
                        y="10"
                        width="44"
                        height="160"
                        fill="transparent"
                      />
                      
                      {/* Active bar highlight background */}
                      {isHovered && (
                        <rect
                          x={x - 6}
                          y="15"
                          width="32"
                          height="150"
                          rx="6"
                          className="fill-slate-100/55 dark:fill-slate-800/30 transition-all duration-200"
                        />
                      )}

                      {/* Actual Bar */}
                      <rect
                        x={x}
                        y={y}
                        width="20"
                        height={barHeight || 1}
                        rx="4"
                        fill={isHovered ? "url(#hoverBarGradient)" : "url(#barGradient)"}
                        className="transition-all duration-200"
                      />

                      {/* X-axis Month label */}
                      <text
                        x={x + 10}
                        y="180"
                        textAnchor="middle"
                        className={`text-[10px] font-bold transition-colors duration-150 ${
                          isHovered
                            ? "fill-pink-650 dark:fill-pink-400 font-extrabold"
                            : "fill-slate-400 dark:fill-slate-500"
                        }`}
                      >
                        {d.monthName}
                      </text>

                      {/* Value Label on Top of hovered bar */}
                      {d.total > 0 && (
                        <text
                          x={x + 10}
                          y={y - 8}
                          textAnchor="middle"
                          className={`text-[9px] font-black transition-all duration-150 ${
                            isHovered
                              ? "fill-slate-900 dark:fill-white opacity-100 scale-105"
                              : "fill-slate-555 dark:fill-slate-400 opacity-0 group-hover/bar:opacity-100"
                          }`}
                        >
                          ฿{d.total.toLocaleString()}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* X Axis Line */}
                <line
                  x1="45"
                  y1="160"
                  x2="580"
                  y2="160"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  className="opacity-45 dark:opacity-20"
                />
              </svg>
            </div>
          </div>

          {/* Company cost breakdown card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-4.5 w-4.5" /> Breakdown by Company (ยอดจำแนกตามบริษัท)
            </h3>

            {companyBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No data available.</p>
            ) : (
              <div className="space-y-4 pt-2">
                {companyBreakdown.map((item, idx) => {
                  const percent = totalCostYear > 0 ? (item.cost / totalCostYear) * 100 : 0
                  return (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-750 dark:text-slate-350">{item.name}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ฿{item.cost.toLocaleString()} ({Math.round(percent)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Level cost breakdown card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5" /> Breakdown by Customer Level
            </h3>

            {levelBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No data available.</p>
            ) : (
              <div className="space-y-3.5 pt-2">
                {levelBreakdown.map((item) => {
                  const percent = totalCostYear > 0 ? (item.totalCost / totalCostYear) * 100 : 0
                  return (
                    <div key={item.id} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-750 dark:text-slate-300">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({item.count} gifts)</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ฿{item.totalCost.toLocaleString()} ({Math.round(percent)}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Breakdown by Activity Type */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GiftIcon className="h-4.5 w-4.5 text-pink-500" /> Breakdown by Activity Type (ยอดจำแนกตามกิจกรรมการบริการลูกค้า)
            </h3>

            {activityBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No data available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {activityBreakdown.map((item) => {
                  const percent = totalCostYear > 0 ? (item.totalCost / totalCostYear) * 100 : 0
                  return (
                    <div key={item.id} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-750 dark:text-slate-350">{item.name}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ฿{item.totalCost.toLocaleString()} ({Math.round(percent)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top Customers Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5" /> Top Customers by Relationship Costs
            </h3>

            {customerBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="py-2.5">Customer Name</th>
                      <th className="py-2.5">Level</th>
                      <th className="py-2.5 text-center">Gifts Logged</th>
                      <th className="py-2.5 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {customerBreakdown.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/20">
                        <td className="py-2.5 font-bold">
                          <Link href={`/customers/${item.id}`} className="hover:text-indigo-650 hover:underline">
                            {item.name}
                          </Link>
                        </td>
                        <td className="py-2.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase"
                            style={{
                              backgroundColor: `${item.levelColor}15`,
                              color: item.levelColor,
                              borderColor: `${item.levelColor}30`,
                            }}
                          >
                            {item.level}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-medium text-slate-500">{item.count}</td>
                        <td className="py-2.5 text-right font-black text-slate-900 dark:text-white">
                          ฿{item.totalCost.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Select Customer First Modal */}
      {showCustomerSelectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCustomerSelectModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Gift - Select Customer</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Please choose which customer receives this gift</p>
            </div>
            
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                Select Customer (เลือกลูกค้า) *
              </label>

              {/* Customer Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อลูกค้า..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 focus:border-indigo-500 focus:outline-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Customer List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {filteredCustomersForSelect.length === 0 ? (
                  <div className="p-3 text-center text-slate-455 text-xs">
                    ไม่พบข้อมูลลูกค้า
                  </div>
                ) : (
                  filteredCustomersForSelect.map((c) => {
                    const isSelected = selectedCustomerId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`w-full text-left p-2.5 px-3.5 text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-pink-50 dark:bg-pink-950/20 text-pink-650 dark:text-pink-400 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        <span>{c.full_name}</span>
                        {isSelected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-pink-600 dark:bg-pink-550" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCustomerSelectModal(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedCustomerId) {
                    alert('Please select a customer')
                    return
                  }
                  setShowCustomerSelectModal(false)
                  setEditingGift(null)
                  setShowGiftForm(true)
                }}
                disabled={!selectedCustomerId}
                className="flex-1 py-3 bg-pink-650 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gift Form Popup */}
      {showGiftForm && (
        <GiftForm
          customerId={selectedCustomerId}
          gift={editingGift}
          onClose={() => {
            setShowGiftForm(false)
            setEditingGift(null)
            setSelectedCustomerId('')
          }}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
