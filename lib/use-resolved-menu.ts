'use client'

import { useEffect, useState } from 'react'
import { menuItems, type MenuItem } from '@/lib/menu-data'
import { createClient } from '@/lib/supabase/client'

export type ResolvedMenuItem = MenuItem & { available: boolean }

const baseline: ResolvedMenuItem[] = menuItems.map((item) => ({ ...item, available: true }))

// Merges the admin panel's per-item availability + price overrides onto the
// static menu data. Missing rows (or a null price_override) fall back to the
// code-defined defaults — mirrors place_order()'s own fallback logic.
export function useResolvedMenu(): ResolvedMenuItem[] {
  const [resolved, setResolved] = useState<ResolvedMenuItem[]>(baseline)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    supabase
      .from('menu_availability')
      .select('item_id, is_available, price_override')
      .then(({ data }) => {
        if (cancelled || !data) return
        const overrides = new Map(data.map((row) => [row.item_id, row]))
        setResolved(
          menuItems.map((item) => {
            const override = overrides.get(item.id)
            return {
              ...item,
              price: override?.price_override ?? item.price,
              available: override ? override.is_available : true,
            }
          })
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  return resolved
}
