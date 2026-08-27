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

// The menu itself now lives in the menu_items table (admin-managed — see
// /admin/menu), not in code, so this fetches it fresh on every mount rather
// than falling back to any bundled default.
export function useResolvedMenu(): ResolvedMenuItem[] {
  const [resolved, setResolved] = useState<ResolvedMenuItem[]>([])

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
        setResolved(
          data.map((row) => ({
            id: row.id,
            category: row.category,
            name: row.name,
            subtitle: row.subtitle,
            price: row.price,
            image: row.image,
            available: row.is_available,
          }))
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  return resolved
}
