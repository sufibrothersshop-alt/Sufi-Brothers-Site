// Individual items live in the menu_items table (admin-managed from
// /admin/menu — see lib/use-resolved-menu.ts), not here. This file only
// keeps the fixed category list/emoji and the shape items come back in.
export type MenuItem = {
  id: number
  category: string
  name: string
  subtitle: string
  price: number
  image: string | null
}

export const categories = [
  'Deals',
  'Burgers',
  'Shawarma & Rolls',
  'Chicken',
  'Fries',
  'Chaat & Bhalle',
  'Ice Cream',
  'Juices & Shakes',
  'Cold Drinks',
] as const

export const categoryEmoji: Record<string, string> = {
  Deals: '🔥',
  Burgers: '🍔',
  'Shawarma & Rolls': '🌯',
  Chicken: '🍗',
  Fries: '🍟',
  'Chaat & Bhalle': '🥗',
  'Ice Cream': '🍨',
  'Juices & Shakes': '🥤',
  'Cold Drinks': '🧊',
}
