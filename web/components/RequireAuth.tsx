"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let mounted = true

    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      const exists = !!data?.session
      setHasSession(exists)
      setChecked(true)
      if (!exists) router.replace('/login')
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const exists = !!session
      setHasSession(exists)
      if (!exists) router.replace('/login')
    })

    check()
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [router])

  if (!checked) return <div>Loading…</div>
  if (!hasSession) return null
  return <>{children}</>
}
