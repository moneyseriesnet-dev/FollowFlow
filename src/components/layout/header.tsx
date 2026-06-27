'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, LogOut, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import GradientMenu from '@/components/ui/gradient-menu'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return 'Dashboard'
      case '/customers':
        return 'Customers (ลูกค้า)'
      case '/policies':
        return 'Policies (กรมธรรม์)'
      case '/reminders':
        return 'Reminders (การแจ้งเตือน)'
      case '/activities':
        return 'Activities (กิจกรรม)'
      case '/gifts':
        return 'Gifts (ค่าของขวัญ)'
      case '/import':
        return 'OCR Screenshot Import'
      case '/settings':
        return 'Settings (ตั้งค่า)'
      default:
        if (path.startsWith('/customers/')) return 'Customer Detail'
        if (path.startsWith('/policies/')) return 'Policy Detail'
        return 'FollowFlow'
    }
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'U'

  return (
    <header className="sticky top-0 z-40 flex h-16 lg:h-20 w-full items-center justify-between border-b border-slate-200 bg-white/80 dark:bg-slate-900/80 dark:border-slate-800 backdrop-blur-xl px-4 lg:px-8 transition-all duration-200">
      {/* Brand & Page Title */}
      <div className="flex items-center gap-2 lg:gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white tracking-wide text-base hidden sm:inline-block">FollowFlow</span>
        </Link>
        <span className="hidden lg:inline-block h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
        <h1 className="text-sm lg:text-base font-semibold text-slate-600 dark:text-slate-400">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Desktop Gradient Menu Navigation */}
      <div className="hidden lg:flex items-center justify-center">
        <GradientMenu />
      </div>

      {/* Actions (Notifications, User, Logout) */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Notification Bell */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 flex h-2 w-2 rounded-full bg-indigo-600" />
        </button>

        {/* Logout Button (Desktop only) */}
        <button 
          onClick={handleLogout}
          className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>

        {/* User Info & Avatar */}
        <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Active User</span>
            <span className="text-[10px] text-slate-500 max-w-[120px] truncate">{user?.email || 'loading...'}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-bold text-sm border border-indigo-200 dark:border-indigo-900/30">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
