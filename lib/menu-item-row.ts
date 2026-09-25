import type { MenuItem, MenuItemOptionGroup } from '@/lib/menu-data'

// Shared between the client fetch (lib/use-resolved-menu.ts) and the
// server-side first-paint fetch (app/[branch]/page.tsx) so the two never
// drift out of sync on what a menu_items row looks like or how it's turned
// into a ResolvedMenuItem. Defined here (not in use-resolved-menu.ts, which
// re-exports it) so that file can import this one without a cycle.
export type ResolvedMenuItem = MenuItem & { available: boolean; optionGroups: MenuItemOptionGroup[] }

export const MENU_ITEM_SELECT =
  'id, category, name, subtitle, price, image, is_available, ' +
  'menu_item_option_groups(id, name, required, sort_order, ' +
  'menu_item_option_choices(id, name, price_delta, sort_order))'

export type MenuItemRow = {
  id: number
  category: string
  name: string
  subtitle: string
  price: number
  image: string | null
  is_available: boolean
  menu_item_option_groups: {
    id: number
    name: string
    required: boolean
    sort_order: number
    menu_item_option_choices: { id: number; name: string; price_delta: number; sort_order: number }[]
  }[] | null
}

export function toResolvedMenuItem(row: MenuItemRow): ResolvedMenuItem {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    subtitle: row.subtitle,
    price: row.price,
    image: row.image,
    available: row.is_available,
    optionGroups: (row.menu_item_option_groups ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => ({
        id: g.id,
        name: g.name,
        required: g.required,
        choices: (g.menu_item_option_choices ?? [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c) => ({ id: c.id, name: c.name, priceDelta: c.price_delta })),
      })),
  }
}
