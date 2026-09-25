import type { MenuItem } from '@/lib/menu-data'

// A cart line is one specific combination of a menu item + its selected
// option choices (e.g. "Zinger Burger, Large, Spicy") — the same base item
// with different choices needs its own line, since it's priced and printed
// differently. `key` makes that combination addressable in a plain object,
// the same way a bare item id used to before variants existed.
export type CartLine = {
  key: string
  itemId: number
  choiceIds: number[]
  quantity: number
}

export function cartLineKey(itemId: number, choiceIds: number[]): string {
  return `${itemId}:${[...choiceIds].sort((a, b) => a - b).join(',')}`
}

// True if the customer must resolve at least one option group (e.g. pick a
// size) before this item can be added — used to force the detail dialog
// open instead of letting the grid's quick-add button skip the choice.
export function dishRequiresChoice(dish: MenuItem): boolean {
  return dish.optionGroups.some((g) => g.required)
}

function resolveChoices(dish: MenuItem, choiceIds: number[]) {
  const byId = new Map(dish.optionGroups.flatMap((g) => g.choices).map((c) => [c.id, c]))
  return choiceIds.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c)
}

// Base price + every selected choice's priceDelta.
export function lineUnitPrice(dish: MenuItem, choiceIds: number[]): number {
  return dish.price + resolveChoices(dish, choiceIds).reduce((sum, c) => sum + c.priceDelta, 0)
}

// "Large, Spicy" — the chosen options, for display next to the item name.
export function lineOptionsSummary(dish: MenuItem, choiceIds: number[]): string {
  return resolveChoices(dish, choiceIds).map((c) => c.name).join(', ')
}
