'use client'

import { useState } from 'react'
import { categories, categoryEmoji, menuItems } from '@/lib/menu-data'
import { resetItemPrice, setItemAvailability, updateItemPrice } from '@/app/admin/actions'

type Override = { is_available: boolean; price_override: number | null }

export function MenuAvailabilitySection({ overrides }: { overrides: Record<number, Override> }) {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0])
  const items = menuItems.filter((item) => item.category === activeCategory)

  return (
    <section>
      <h2 className="mb-4 font-serif text-xl font-black">Menu management ({menuItems.length})</h2>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-sm">
        {categories.map((category) => {
          const count = menuItems.filter((item) => item.category === category).length
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                activeCategory === category ? 'bg-secondary text-secondary-foreground shadow-sm' : 'bg-background text-muted-foreground hover:bg-secondary/30'
              }`}
            >
              <span>{categoryEmoji[category]}</span>
              {category}
              <span className="text-xs opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const override = overrides[item.id]
          const soldOut = override?.is_available === false
          const effectivePrice = override?.price_override ?? item.price
          const hasPriceOverride = override?.price_override != null

          return (
            <div key={item.id} className={`rounded-2xl border p-4 ${soldOut ? 'border-destructive/30 bg-destructive/5' : 'border-secondary/50 bg-secondary/10'}`}>
              <p className={`text-sm font-bold ${soldOut ? 'text-muted-foreground line-through' : ''}`}>{item.name}</p>

              <form action={setItemAvailability.bind(null, item.id, soldOut)} className="mt-2">
                <button
                  type="submit"
                  className={`w-full rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide transition hover:brightness-95 ${
                    soldOut ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {soldOut ? 'Sold out — tap to restock' : 'Available — tap to sell out'}
                </button>
              </form>

              <form action={updateItemPrice.bind(null, item.id)} className="mt-2 flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Rs.</span>
                <input
                  name="price"
                  type="number"
                  step="1"
                  min="1"
                  defaultValue={effectivePrice}
                  className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                />
                <button type="submit" className="rounded-lg bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">Save</button>
              </form>

              {hasPriceOverride && (
                <form action={resetItemPrice.bind(null, item.id)} className="mt-1">
                  <button type="submit" className="text-[10px] font-bold text-muted-foreground underline">Reset to Rs. {item.price}</button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
