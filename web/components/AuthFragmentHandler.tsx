"use client"

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthFragmentHandler() {
  useEffect(() => {
    async function handleFragment() {
      if (typeof window === 'undefined') return
      if (!window.location.hash) return

      const hash = new URLSearchParams(window.location.hash.slice(1))
      const access_token = hash.get('access_token') || undefined
      const refresh_token = hash.get('refresh_token') || undefined

      if (access_token && refresh_token) {
        try {
          await supabase.auth.setSession({ access_token, refresh_token })
          // Clean up URL: remove fragment
          const cleanUrl = window.location.origin + window.location.pathname + window.location.search
          window.history.replaceState({}, document.title, cleanUrl)
        } catch (e) {
          // ignore – fallback handled on /auth/callback as well
          // eslint-disable-next-line no-console
          console.warn('Failed to set session from fragment:', e)
        }
      }
    }
    handleFragment()
  }, [])

  return null
}
