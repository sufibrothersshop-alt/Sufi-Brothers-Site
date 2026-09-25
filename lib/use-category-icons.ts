'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Branch } from '@/lib/branches'

// Admin-assigned category emoji (category_icons table, /admin/menu). `initial`
// is the server-fetched snapshot for first paint; this re-fetches once on
// mount to pick up any admin change made after that snapshot was taken, same
// pattern as lib/use-resolved-menu.ts.
export function useCategoryIcons(branch: Branch, initial: Record<string, string> = {}): Record<string, string> {
  const [icons, setIcons] = useState<Record<string, string>>(initial)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    supabase
      .from('category_icons')
      .select('category, emoji')
      .eq('branch', branch)
      .then(({ data }) => {
        if (cancelled || !data) return
        setIcons(Object.fromEntries(data.map((row) => [row.category, row.emoji])))
      })

    return () => {
      cancelled = true
    }
  }, [branch])

  return icons
}
