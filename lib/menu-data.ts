// Individual items live in the menu_items table (admin-managed from
// /admin/menu — see lib/use-resolved-menu.ts), not here. This file only
// keeps the fixed category list/emoji and the shape items come back in.

// A single pickable choice within a group, e.g. "Large" (+Rs. 100) inside a
// "Size" group. priceDelta is added to the item's base price when chosen —
// it can be 0, positive, or negative.
export type MenuItemOptionChoice = {
  id: number
  name: string
  priceDelta: number
}

// A single-select variant question, e.g. "Size" or "Flavour". When
// `required`, the customer must pick exactly one choice before the item can
// be added to the cart.
export type MenuItemOptionGroup = {
  id: number
  name: string
  required: boolean
  choices: MenuItemOptionChoice[]
}

export type MenuItem = {
  id: number
  category: string
  name: string
  subtitle: string
  price: number
  image: string | null
  optionGroups: MenuItemOptionGroup[]
}

// The original (Ghouri Town) category set — still used to order/emoji any
// category that happens to match one of these names. Branches aren't
// limited to this list: admins can type a brand-new category name straight
// into the "Add item" form (see components/admin/menu-availability.tsx),
// and categoriesFromItems below picks it up automatically.
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

const DEFAULT_CATEGORY_EMOJI = '🍽️'

// `overrides` is a branch's admin-assigned icons (category_icons table, see
// lib/use-category-icons.ts) — checked first so an admin's own choice always
// wins. Falls back to the built-in map, then a generic plate icon for a
// category nobody's assigned an icon to yet.
export function getCategoryEmoji(category: string, overrides: Record<string, string> = {}): string {
  return overrides[category] ?? categoryEmoji[category] ?? DEFAULT_CATEGORY_EMOJI
}

// Distinct categories actually present in this branch's items, ordered so
// the original Ghouri Town categories keep their familiar order first, and
// any category an admin made up gets appended after, in the order it first
// appears (i.e. whenever its first item was added).
export function categoriesFromItems(items: { category: string }[]): string[] {
  const present = new Set(items.map((item) => item.category))
  const known = categories.filter((c) => present.has(c))
  const custom = [...present].filter((c) => !(categories as readonly string[]).includes(c))
  return [...known, ...custom]
}
