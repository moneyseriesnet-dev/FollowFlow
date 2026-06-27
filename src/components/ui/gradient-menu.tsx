'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  IoHomeOutline, 
  IoPeopleOutline, 
  IoDocumentTextOutline, 
  IoNotificationsOutline, 
  IoPulseOutline, 
  IoGiftOutline, 
  IoCameraOutline, 
  IoSettingsOutline 
} from 'react-icons/io5'

interface MenuItem {
  href: string
  title: string
  icon: React.ReactNode
  gradientFrom: string
  gradientTo: string
}

const menuItems: MenuItem[] = [
  { href: '/', title: 'Home', icon: <IoHomeOutline />, gradientFrom: '#a955ff', gradientTo: '#ea51ff' },
  { href: '/customers', title: 'Customers', icon: <IoPeopleOutline />, gradientFrom: '#56CCF2', gradientTo: '#2F80ED' },
  { href: '/policies', title: 'Policies', icon: <IoDocumentTextOutline />, gradientFrom: '#FF9966', gradientTo: '#FF5E62' },
  { href: '/reminders', title: 'Reminders', icon: <IoNotificationsOutline />, gradientFrom: '#FF5E62', gradientTo: '#FFD97D' },
  { href: '/activities', title: 'Activities', icon: <IoPulseOutline />, gradientFrom: '#80FF72', gradientTo: '#7EE8FA' },
  { href: '/gifts', title: 'Gifts', icon: <IoGiftOutline />, gradientFrom: '#ffa9c6', gradientTo: '#f434e2' },
  { href: '/import', title: 'Import', icon: <IoCameraOutline />, gradientFrom: '#36D1DC', gradientTo: '#5B86E5' },
  { href: '/settings', title: 'Settings', icon: <IoSettingsOutline />, gradientFrom: '#bdc3c7', gradientTo: '#2c3e50' }
]

export default function GradientMenu() {
  const pathname = usePathname()

  return (
    <nav className="flex justify-center items-center py-2">
      <ul className="flex gap-3">
        {menuItems.map(({ href, title, icon, gradientFrom, gradientTo }, idx) => {
          // Home is active only on root, others on prefix match
          const isActive = href === '/' 
            ? pathname === '/' 
            : pathname === href || pathname.startsWith(href + '/')

          return (
            <li
              key={idx}
              style={{ 
                '--gradient-from': gradientFrom, 
                '--gradient-to': gradientTo 
              } as React.CSSProperties}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 hover:w-[130px] hover:shadow-none group cursor-pointer ${
                isActive 
                  ? 'shadow-none bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))]' 
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              <Link href={href} className="absolute inset-0 flex items-center justify-center rounded-full">
                {/* Gradient background on hover (for inactive items) */}
                <span className={`absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] transition-all duration-500 group-hover:opacity-100 ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}></span>
                
                {/* Blur glow on hover */}
                <span className={`absolute top-[6px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[10px] transition-all duration-500 group-hover:opacity-50 -z-10 ${
                  isActive ? 'opacity-30' : 'opacity-0'
                }`}></span>

                {/* Icon */}
                <span className="relative z-10 transition-all duration-500 group-hover:scale-0 delay-0">
                  <span className={`text-xl transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-white'
                  }`}>
                    {icon}
                  </span>
                </span>

                {/* Title */}
                <span className="absolute text-white uppercase tracking-wide text-[10px] font-bold transition-all duration-500 scale-0 group-hover:scale-100 delay-150">
                  {title}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
