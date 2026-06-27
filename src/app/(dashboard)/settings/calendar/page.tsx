'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Link2,
  Link2Off,
  Settings
} from 'lucide-react'

function CalendarSyncSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient() as any

  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [credentials, setCredentials] = useState<any>(null)
  
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  // Retrieve query parameter flags
  const successParam = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (errorParam) {
      setLocalError(decodeURIComponent(errorParam))
    }
  }, [errorParam])

  const checkConnection = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/settings/calendar')
        return
      }

      const { data, error } = await supabase
        .from('google_credentials')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (error) throw error
      
      if (data) {
        setConnected(true)
        setCredentials(data)

        // Auto-heal: If google_email is missing, fetch and sync it from Google
        if (!data.google_email) {
          try {
            const res = await fetch('/api/auth/google/sync-email', { method: 'POST' })
            if (res.ok) {
              const syncData = await res.json()
              if (syncData.email) {
                setCredentials((prev: any) => ({ ...prev, google_email: syncData.email }))
              }
            }
          } catch (e) {
            console.error('Failed to auto-sync Google email:', e)
          }
        }
      } else {
        setConnected(false)
        setCredentials(null)
      }
    } catch (err: any) {
      console.error('Failed to check calendar connection:', err)
      setLocalError(err.message || 'Failed to check connection status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  const handleConnect = async () => {
    setLoading(true)
    setLocalError(null)
    try {
      const res = await fetch('/api/auth/google/url')
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate authorization URL.')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('Connect calendar error:', err)
      setLocalError(err.message || 'Failed to start authorization flow.')
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will stop automatic syncing and reset event identifiers.')) return
    
    setDisconnecting(true)
    setLocalError(null)
    setSyncResult(null)
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to disconnect account.')
      }

      setConnected(false)
      setCredentials(null)
      alert('Successfully disconnected Google Calendar.')
    } catch (err: any) {
      console.error('Disconnect error:', err)
      setLocalError(err.message || 'Failed to disconnect Google Calendar.')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleTriggerSync = async () => {
    setSyncing(true)
    setLocalError(null)
    setSyncResult(null)
    try {
      const res = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Sync failed.')
      }

      setSyncResult(`Successfully synced ${data.syncedCount || 0} unsynced reminders to Google Calendar!`)
    } catch (err: any) {
      console.error('Batch sync error:', err)
      setLocalError(err.message || 'Failed to perform calendar sync.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Navigation */}
      <button
        onClick={() => router.push('/settings')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Settings
      </button>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">
          Google Calendar Sync (เชื่อมต่อปฏิทิน Google)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          Sync your CRM reminders, birthdates, and policy payments to your personal Google Calendar
        </p>
      </div>

      {/* Connection Alerts */}
      {localError && (
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 text-xs font-semibold flex gap-2.5 items-start">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Integration Error</p>
            <p className="font-medium opacity-90 leading-relaxed">{localError}</p>
          </div>
        </div>
      )}

      {successParam && connected && !localError && (
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 text-xs font-semibold flex gap-2.5 items-start">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Connection Successful!</p>
            <p className="font-medium opacity-90 leading-relaxed">
              Your Google account {credentials?.google_email ? `(${credentials.google_email}) ` : ''}is now securely linked. Reminders will sync automatically.
            </p>
          </div>
        </div>
      )}

      {syncResult && (
        <div className="p-4 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400 text-xs font-semibold flex gap-2.5 items-start">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Sync Completed</p>
            <p className="font-medium opacity-90 leading-relaxed">{syncResult}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="text-center space-y-2">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs text-slate-400">Verifying calendar sync status...</p>
          </div>
        </div>
      ) : connected ? (
        /* Connected View */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/20 shrink-0">
                <Link2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-850 dark:text-slate-200">Google Calendar Connected</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-transparent">
                    Active
                  </span>
                </div>
                {credentials?.google_email && (
                  <p className="text-xs text-slate-600 dark:text-slate-350">
                    Connected account: <span className="font-bold text-slate-800 dark:text-slate-100">{credentials.google_email}</span>
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Default calendar: <span className="font-mono bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{credentials?.calendar_id || 'primary'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2.5 border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
              Disconnect Account
            </button>
          </div>

          {/* Sync Operations Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="h-4.5 w-4.5" /> Calendar Synchronization Tools
            </h3>
            
            <div className="text-xs text-slate-500 leading-relaxed space-y-3">
              <p>
                FollowFlow automatically syncs updates for new or modified reminders that have the "Sync to Google Calendar" setting checked. 
              </p>
              <p>
                If some of your reminders are currently out of sync or failed due to network drops, you can force-run a full batch synchronization of all pending items below.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                className="px-5 py-3 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-600/15 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync All Pending Reminders Now
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Disconnected View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-400">
            <Calendar className="h-7 w-7" />
          </div>

          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Connect Google Calendar</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Link your CRM to your Google Calendar to synchronize payment deadlines, reviews, and birthdays as all-day events automatically.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleConnect}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-colors shadow-xl shadow-indigo-600/20 cursor-pointer"
            >
              <Link2 className="h-4.5 w-4.5" />
              Connect Google Account
            </button>
          </div>
          
          <div className="text-[10px] text-slate-400 max-w-xs mx-auto border-t border-slate-50 dark:border-slate-800/60 pt-4 leading-normal">
            Your connection details are stored securely. You can revoke permissions or disconnect at any time.
          </div>
        </div>
      )}
    </div>
  )
}

export default function CalendarSyncSettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <CalendarSyncSettingsContent />
    </Suspense>
  )
}
