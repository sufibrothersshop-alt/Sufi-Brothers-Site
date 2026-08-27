'use client'

import { useEffect, useState } from 'react'
import type { MenuItem } from '@/lib/menu-data'
import { createClient } from '@/lib/supabase/client'

export type ResolvedMenuItem = MenuItem & { available: boolean }

type MenuItemRow = {
  id: number
  category: string
  name: string
  subtitle: string
  price: number
  image: string | null
  is_available: boolean
}

function toResolved(row: MenuItemRow): ResolvedMenuItem {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    subtitle: row.subtitle,
    price: row.price,
    image: row.image,
    available: row.is_available,
  }
}

// The menu itself lives in the menu_items table (admin-managed — see
// /admin/menu), not in code. `initial` is the server-fetched snapshot used
// for the first paint (so the page isn't blank while this client fetch is
// in flight); this still re-fetches once on mount to pick up any admin
// change made after that snapshot was taken.
export function useResolvedMenu(initial: ResolvedMenuItem[] = []): ResolvedMenuItem[] {
  const [resolved, setResolved] = useState<ResolvedMenuItem[]>(initial)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    supabase
      .from('menu_items')
      .select('id, category, name, subtitle, price, image, is_available')
      .order('id')
      .returns<MenuItemRow[]>()
      .then(({ data }) => {
        if (cancelled || !data) return
        setResolved(data.map(toResolved))
      })

    return () => {
      cancelled = true
    }
  }, [])

  return resolved
}
