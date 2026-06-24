'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  Activity,
  Gift,
  Camera,
  Settings,
  LogOut,
  Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/policies', icon: FileText, label: 'Policies' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
  { href: '/activities', icon: Activity, label: 'Activities' },
  { href: '/gifts', icon: Gift, label: 'Gifts' },
  { href: '/import', icon: Camera, label: 'OCR Import' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-0 h-screen border-r border-slate-800 bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-lg">FollowFlow</h1>
          <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">CRM Platform</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-950/30 hover:text-red-400 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  )
}
