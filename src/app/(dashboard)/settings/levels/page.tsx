'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
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
  AlertTriangle,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit2,
  Save,
  X,
  Palette
} from 'lucide-react'

interface CustomerLevel {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  rule_type: 'manual' | 'ai_suggested' | 'auto_detected' | null
  created_at: string | null
}

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

export default function CustomerLevelsSettingsPage() {
  const router = useRouter()
  const supabase = createClient() as any

  const [loading, setLoading] = useState(true)
  const [levels, setLevels] = useState<CustomerLevel[]>([])
  const [error, setError] = useState<string | null>(null)

  // Form states (For Create/Edit Modal)
  const [showModal, setShowModal] = useState(false)
  const [editingLevel, setEditingLevel] = useState<CustomerLevel | null>(null)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6B7280')
  const [icon, setIcon] = useState('Crown')
  const [saving, setSaving] = useState(false)

  const loadLevels = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchErr } = await supabase
        .from('customer_levels')
        .select('*')
        .order('created_at', { ascending: true })

      if (fetchErr) throw fetchErr
      setLevels(data || [])
    } catch (err: any) {
      console.error('Failed to load levels:', err)
      setError(err.message || 'Failed to fetch customer levels.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLevels()
  }, [])

  const handleOpenCreate = () => {
    setEditingLevel(null)
    setName('')
    setDescription('')
    setColor('#6366f1') // Indigo default
    setIcon('Crown')
    setShowModal(true)
  }

  const handleOpenEdit = (lvl: CustomerLevel) => {
    setEditingLevel(lvl)
    setName(lvl.name)
    setDescription(lvl.description || '')
    setColor(lvl.color || '#6B7280')
    setIcon(lvl.icon || 'Crown')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) {
        throw new Error('User not authenticated. Please log in again.')
      }

      const payload = {
        owner_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        color,
        icon,
        rule_type: 'manual', // default rule type
        updated_by: user.id
      }

      if (editingLevel) {
        // Edit mode
        const { error: saveErr } = await supabase
          .from('customer_levels')
          .update(payload)
          .eq('id', editingLevel.id)
        if (saveErr) throw saveErr
      } else {
        // Create mode
        const { error: saveErr } = await supabase
          .from('customer_levels')
          .insert({
            ...payload,
            created_by: user.id
          })
        if (saveErr) throw saveErr
      }

      setShowModal(false)
      loadLevels()
    } catch (err: any) {
      alert(err.message || 'Failed to save level.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (lvlId: string) => {
    if (!confirm('Are you sure you want to delete this level? Any customers assigned to this level will be reset to No Level.')) return
    try {
      const { error: delErr } = await supabase
        .from('customer_levels')
        .delete()
        .eq('id', lvlId)

      if (delErr) throw delErr
      loadLevels()
    } catch (err: any) {
      alert(err.message || 'Failed to delete level')
    }
  }

  // Predefined color palette for clean premium UI matching standard HSL tails
  const colorPalette = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#84cc16', // Lime
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ef4444', // Red
    '#ec4899', // Pink
    '#d946ef', // Fuchsia
    '#a855f7', // Purple
    '#6b7280'  // Gray
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Back to settings navigation */}
      <button
        onClick={() => router.push('/settings')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
            Customer Levels (ระดับความสำคัญลูกค้า)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Configure levels, colors, and tier classifications for client filtering
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-600/15 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Level
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : levels.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm">
          <Crown className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">No levels configured</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Create custom customer levels (like VIP, Silver, Bronze, or Watchlist) to easily prioritize followups.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {levels.map((lvl) => {
              const IconComponent = AVAILABLE_ICONS[lvl.icon as keyof typeof AVAILABLE_ICONS] || Crown
              return (
                <div
                  key={lvl.id}
                  className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/20 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold"
                      style={{ backgroundColor: lvl.color || '#6B7280' }}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-850 dark:text-slate-200">{lvl.name}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase border"
                        style={{
                          backgroundColor: `${lvl.color}15`,
                          color: lvl.color || '#6B7280',
                          borderColor: `${lvl.color}30`
                        }}
                      >
                        {lvl.name}
                      </span>
                    </div>
                    {lvl.description && (
                      <p className="text-[11px] text-slate-500 max-w-[380px] leading-normal">
                        {lvl.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(lvl)}
                    className="p-2 rounded-lg text-slate-500 bg-slate-50 dark:bg-slate-800 hover:bg-slate-150 transition-colors"
                    title="Edit level"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(lvl.id)}
                    className="p-2 rounded-lg text-red-650 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 transition-colors"
                    title="Delete level"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingLevel ? 'Edit Customer Level' : 'Create Customer Level'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                  Level Name (ชื่อระดับความสำคัญ) *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. VIP, A-Class, Watchlist"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                  Description (คำอธิบาย)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this level represent?"
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5" /> Level Icon (ไอคอนแสดงระดับ)
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(AVAILABLE_ICONS).map(([iconName, IconComponent]) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      className={`h-9 flex items-center justify-center rounded-xl transition-all border cursor-pointer ${
                        icon === iconName
                          ? 'border-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 ring-2 ring-indigo-600/20 scale-105'
                          : 'border-slate-200 dark:border-slate-800/80 text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                      title={iconName}
                    >
                      <IconComponent className="h-4.5 w-4.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker palette */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Palette className="h-3.5 w-3.5" /> Level Accent Color (สีประจำกลุ่ม)
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {colorPalette.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setColor(col)}
                      className={`h-8 rounded-lg transition-transform border ${
                        color === col
                          ? 'ring-2 ring-indigo-650 scale-105 border-white dark:border-slate-900'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                {/* Custom HEX input */}
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-12 rounded border cursor-pointer border-slate-200 dark:border-slate-800"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 px-2 w-28 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Level
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
