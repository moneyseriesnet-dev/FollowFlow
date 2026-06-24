import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for use in browser (Client Components).
 *
 * This is a singleton by default — calling createClient() multiple times
 * returns the same instance. Cookie handling uses document.cookie
 * automatically when getAll/setAll are omitted.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  )
}
