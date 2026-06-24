'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Bell,
  Camera,
  Menu,
  FileText,
  Activity,
  Gift,
  Settings,
  LogOut,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const primaryItems = [
    { href: '/', icon: LayoutDashboard, label: 'Home' },
    { href: '/customers', icon: Users, label: 'Customers' },
    { href: '/import', icon: Camera, label: 'Import' },
    { href: '/reminders', icon: Bell, label: 'Reminders' },
  ]

  const moreItems = [
    { href: '/policies', icon: FileText, label: 'Policies' },
    { href: '/activities', icon: Activity, label: 'Activities' },
    { href: '/gifts', icon: Gift, label: 'Gifts' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between px-2 py-1 pb-safe">
          {primaryItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            )
          })}
          
          <button
            onClick={() => setShowMenu(true)}
            className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-slate-500 hover:text-indigo-600"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up Overlay Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all duration-300 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">All Menu</h2>
              <button
                onClick={() => setShowMenu(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {moreItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5 text-indigo-500" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <button
              onClick={() => {
                setShowMenu(false)
                handleLogout()
              }}
              className="flex w-full items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-medium border border-red-100 dark:border-red-900/30"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  )
}
