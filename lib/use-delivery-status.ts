'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Branch } from '@/lib/branches'

const POLL_MS = 20000

// Missing row/failed fetch defaults to enabled — never accidentally block
// ordering because of a transient network hiccup.
export function useDeliveryStatus(branch: Branch): boolean {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const check = async () => {
      const { data } = await supabase.from('site_settings').select('delivery_enabled').eq('branch', branch).maybeSingle()
      if (!cancelled && data) setEnabled(data.delivery_enabled)
    }

    check()
    const id = setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [branch])

  return enabled
}
