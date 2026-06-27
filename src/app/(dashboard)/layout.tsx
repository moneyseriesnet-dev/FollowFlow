import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/layout/bottom-nav'
import Header from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()

  // Authenticate user on server side before loading dashboard shell
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Main layout container containing header + content */}
      <div className="flex flex-col min-h-screen">
        {/* Sticky Header */}
        <Header />

        {/* Content area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom navigation for Mobile/Tablet */}
      <BottomNav />
    </div>
  )
}
