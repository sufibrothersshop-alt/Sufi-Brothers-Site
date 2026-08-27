'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { categories, categoryEmoji } from '@/lib/menu-data'
import { addMenuItem, deleteMenuItem, setItemAvailability, updateItemPrice } from '@/app/admin/actions'

export type AdminMenuItem = {
  id: number
  category: string
  name: string
  subtitle: string
  price: number
  image: string | null
  is_available: boolean
}

function AddItemSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
    >
      {pending ? 'Adding…' : 'Add item'}
    </button>
  )
}

function AddItemForm() {
  const [formKey, setFormKey] = useState(0)

  const handleSubmit = async (formData: FormData) => {
    await addMenuItem(formData)
    setFormKey((k) => k + 1) // resets the uncontrolled inputs, including the file picker
  }

  return (
    <form key={formKey} action={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-muted-foreground">Category</label>
        <select name="category" required defaultValue={categories[0]} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {categories.map((c) => (
            <option key={c} value={c}>{categoryEmoji[c]} {c}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-muted-foreground">Name</label>
        <input name="name" required placeholder="e.g. Zinger Burger" className="w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-muted-foreground">Subtitle (optional)</label>
        <input name="subtitle" placeholder="Urdu name, etc." className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-muted-foreground">Price (Rs.)</label>
        <input name="price" type="number" min="1" step="1" required className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-muted-foreground">Photo (optional)</label>
        <input name="image" type="file" accept="image/*" className="text-xs" />
      </div>
      <AddItemSubmitButton />
    </form>
  )
}

export function MenuManagementSection({ items }: { items: AdminMenuItem[] }) {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0])
  const categoryItems = items.filter((item) => item.category === activeCategory)

  return (
    <section>
      <h2 className="mb-4 font-serif text-xl font-black">Menu management ({items.length})</h2>

      <AddItemForm />

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-sm">
        {categories.map((category) => {
          const count = items.filter((item) => item.category === category).length
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
        {categoryItems.map((item) => {
          const soldOut = !item.is_available

          return (
            <div key={item.id} className={`rounded-2xl border p-4 ${soldOut ? 'border-destructive/30 bg-destructive/5' : 'border-secondary/50 bg-secondary/10'}`}>
              {item.image && (
                <img src={item.image} alt={item.name} className="mb-2 h-20 w-full rounded-xl object-cover" />
              )}
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
                  defaultValue={item.price}
                  className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                />
                <button type="submit" className="rounded-lg bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">Save</button>
              </form>

              <form
                action={deleteMenuItem.bind(null, item.id)}
                onSubmit={(e) => {
                  if (!confirm(`Remove "${item.name}" from the menu?`)) e.preventDefault()
                }}
                className="mt-1"
              >
                <button type="submit" className="text-[10px] font-bold text-muted-foreground underline hover:text-destructive">Remove item</button>
              </form>
            </div>
          )
        })}
      </div>
    </section>
  )
}
