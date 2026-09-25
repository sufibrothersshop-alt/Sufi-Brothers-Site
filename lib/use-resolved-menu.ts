'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Branch } from '@/lib/branches'
import { MENU_ITEM_SELECT, toResolvedMenuItem, type MenuItemRow, type ResolvedMenuItem } from '@/lib/menu-item-row'

export type { ResolvedMenuItem }

// The menu itself lives in the menu_items table (admin-managed — see
// /admin/menu), not in code. `initial` is the server-fetched snapshot used
// for the first paint (so the page isn't blank while this client fetch is
// in flight); this still re-fetches once on mount to pick up any admin
// change made after that snapshot was taken.
export function useResolvedMenu(branch: Branch, initial: ResolvedMenuItem[] = []): ResolvedMenuItem[] {
  const [resolved, setResolved] = useState<ResolvedMenuItem[]>(initial)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    supabase
      .from('menu_items')
      .select(MENU_ITEM_SELECT)
      .eq('branch', branch)
      .order('id')
      .returns<MenuItemRow[]>()
      .then(({ data }) => {
        if (cancelled || !data) return
        setResolved(data.map(toResolvedMenuItem))
      })

    return () => {
      cancelled = true
    }
  }, [branch])

  return resolved
}
