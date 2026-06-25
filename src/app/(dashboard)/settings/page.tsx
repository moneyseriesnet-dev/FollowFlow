'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Crown,
  BellRing,
  Download,
  Info,
  ChevronRight,
  Shield,
  Palette,
  LogOut,
  Loader2,
  Calendar
} from 'lucide-react'

const settingsSections = [
  {
    title: 'Customer Levels',
    description: 'Manage customer tier classifications',
    icon: Crown,
    iconBg: 'bg-amber-100 dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    href: '/settings/levels',
  },
  {
    title: 'Google Calendar Sync',
    description: 'Sync your reminders to Google Calendar',
    icon: Calendar,
    iconBg: 'bg-red-100 dark:bg-red-950/30',
    iconColor: 'text-red-650 dark:text-red-400',
    href: '/settings/calendar',
  },
  {
    title: 'Notifications',
    description: 'Reminder and alert preferences',
    icon: BellRing,
    iconBg: 'bg-blue-100 dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    href: '/settings/notifications',
  },
  {
    title: 'Appearance',
    description: 'Theme and display settings',
    icon: Palette,
    iconBg: 'bg-purple-100 dark:bg-purple-950/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    href: '/settings/appearance',
  },
  {
    title: 'Data Export',
    description: 'Export your data as CSV or JSON',
    icon: Download,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    href: '/settings/export',
  },
  {
    title: 'Privacy & Security',
    description: 'Password and account security',
    icon: Shield,
    iconBg: 'bg-red-100 dark:bg-red-950/30',
    iconColor: 'text-red-600 dark:text-red-400',
    href: '/settings/security',
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)
      } catch (err) {
        console.error('Failed to get authenticated user profile info:', err)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [supabase])

  const handleSignOut = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Error signing out')
      setLoggingOut(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Settings</h1>
        <p className="mt-1.5 text-xs text-slate-500">
          Manage your account and CRM preferences
        </p>
      </div>

      {/* Profile Section */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-5 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                <User className="h-8 w-8" />
              </div>
              <div className="text-white space-y-0.5">
                <p className="text-base font-bold leading-tight">
                  {user?.user_metadata?.full_name || 'Insurance Agent'}
                </p>
                <p className="text-xs text-white/80">
                  {loading ? 'Loading profile...' : user?.email || 'no-email@example.com'}
                </p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Subscription Tier</span>
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-950 px-3 py-1 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                FollowFlow Pro
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Settings Sections */}
      <section className="mb-6">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Preferences
        </h2>
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          {settingsSections.map((section, index) => (
            <Link
              key={section.title}
              href={section.href}
              className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                index !== settingsSections.length - 1
                  ? 'border-b border-slate-100 dark:border-slate-800/60'
                  : ''
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.iconBg}`}
              >
                <section.icon
                  className={`h-5 w-5 ${section.iconColor}`}
                />
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {section.title}
                </p>
                <p className="text-slate-400 dark:text-slate-500 mt-0.5">
                  {section.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </div>
      </section>

      {/* Sign Out */}
      <section className="mb-6">
        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="flex w-full items-center gap-4 rounded-3xl border border-red-200 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/15 px-5 py-4 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/40">
            {loggingOut ? (
              <Loader2 className="h-5 w-5 text-red-650 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <p className="text-xs font-bold text-red-600 dark:text-red-400">
            {loggingOut ? 'Signing out...' : 'Sign Out (ออกจากระบบ)'}
          </p>
        </button>
      </section>

      {/* About Section */}
      <section className="mb-10">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
              <Info className="h-5 w-5 text-slate-500" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">FollowFlow</p>
              <p className="text-slate-400 mt-0.5">
                Version 1.0.0 · Insurance Customer CRM
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Mobile-first CRM dashboard tailored for financial planners and insurance agents (AIA & AXA).
            Features OCR screenshot parsing, dynamic level configuration, and smart reminder pipelines.
          </p>
        </div>
      </section>
    </div>
  )
}
