'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Lock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (signUpError) throw signUpError
        setError('Check your email for the confirmation link to complete registration.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-indigo-900 via-purple-900 to-pink-850 px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        {/* Glow effect */}
        <div className="absolute -left-16 -top-16 h-36 w-36 rounded-full bg-indigo-500/30 blur-2xl" />
        <div className="absolute -bottom-16 -right-16 h-36 w-36 rounded-full bg-pink-500/30 blur-2xl" />

        <div className="relative flex flex-col items-center gap-2 mb-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg backdrop-blur-md">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white">FollowFlow</h1>
          <p className="text-xs text-slate-300 font-medium uppercase tracking-wider">CRM Dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-white/10 bg-white/5 text-sm text-pink-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-12 pr-4 text-sm text-white placeholder-slate-400 focus:border-indigo-400 focus:bg-white/10 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-12 pr-4 text-sm text-white placeholder-slate-400 focus:border-indigo-400 focus:bg-white/10 focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-6 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-500/20 active:scale-98 transition-all cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSignUp ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors bg-transparent border-0 cursor-pointer"
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account yet? Register"}
          </button>
        </div>
      </div>
    </div>
  )
}
