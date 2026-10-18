"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'idle'|'working'|'done'|'error'>('idle')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    async function run() {
      setStatus('working')
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      try {
        if (code) {
          // PKCE code flow
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          setStatus('done')
          return
        }

        // Fallback: implicit flow (#access_token in URL fragment)
        if (window.location.hash) {
          const hash = new URLSearchParams(window.location.hash.substring(1))
          const access_token = hash.get('access_token') || undefined
          const refresh_token = hash.get('refresh_token') || undefined
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) throw error
            setStatus('done')
            return
          }
        }

        setStatus('error')
        setMessage('Missing authorization code or access token in callback URL')
      } catch (err: any) {
        setStatus('error')
        setMessage(err?.message || 'Authentication failed')
      }
    }
    run()
  }, [])

  if (status === 'working') return <p>Completing sign-in…</p>
  if (status === 'error') return <p className="text-red-600">Error: {message}</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Signed in</h1>
      <p>Return to the <Link className="underline" href="/">dashboard</Link>.</p>
    </div>
  )
}
