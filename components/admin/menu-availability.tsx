'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { categoriesFromItems, getCategoryEmoji } from '@/lib/menu-data'
import type { ResolvedMenuItem } from '@/lib/use-resolved-menu'
import {
  addMenuItem,
  addOptionChoice,
  addOptionGroup,
  deleteMenuItem,
  deleteOptionChoice,
  deleteOptionGroup,
  setItemAvailability,
  updateItemPrice,
} from '@/app/admin/actions'

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

function AddItemForm({ existingCategories }: { existingCategories: string[] }) {
  const [formKey, setFormKey] = useState(0)

  const handleSubmit = async (formData: FormData) => {
    await addMenuItem(formData)
    setFormKey((k) => k + 1) // resets the uncontrolled inputs, including the file picker
  }

  return (
    <form key={formKey} action={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-muted-foreground">Category</label>
        <input
          name="category"
          list="existing-categories"
          required
          placeholder="Pick or type a new one"
          className="w-44 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <datalist id="existing-categories">
          {existingCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
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
      <p className="w-full text-[11px] text-muted-foreground">Need size/flavour choices (e.g. a pizza)? Add the item first, then set its options below.</p>
    </form>
  )
}

function AddChoiceForm({ groupId }: { groupId: number }) {
  const [formKey, setFormKey] = useState(0)
  const handleSubmit = async (formData: FormData) => {
    await addOptionChoice(groupId, formData)
    setFormKey((k) => k + 1)
  }
  return (
    <form key={formKey} action={handleSubmit} className="mt-1.5 flex flex-wrap items-center gap-1">
      <input name="name" required placeholder="e.g. Large" className="w-20 rounded border border-border bg-background px-1.5 py-1 text-[11px] outline-none focus:border-primary" />
      <input name="price_delta" type="number" step="1" placeholder="+Rs" title="Added to the base price — leave blank or 0 for no change, negative for a discount" className="w-14 rounded border border-border bg-background px-1.5 py-1 text-[11px] outline-none focus:border-primary" />
      <button type="submit" className="rounded bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground hover:brightness-95">+ Choice</button>
    </form>
  )
}

function AddGroupForm({ itemId }: { itemId: number }) {
  const [formKey, setFormKey] = useState(0)
  const handleSubmit = async (formData: FormData) => {
    await addOptionGroup(itemId, formData)
    setFormKey((k) => k + 1)
  }
  return (
    <form key={formKey} action={handleSubmit} className="mt-2 flex flex-wrap items-center gap-1.5">
      <input name="name" required placeholder="New option, e.g. Size" className="w-32 rounded-lg border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary" />
      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <input name="required" type="checkbox" defaultChecked /> Required
      </label>
      <button type="submit" className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold transition hover:bg-secondary">+ Add option</button>
    </form>
  )
}

// The size/flavour-style variant editor for one item — a customer picking
// none of these is fine unless a group is marked Required, in which case
// place_order() itself refuses the order until one is chosen (see
// supabase/schema.sql), same as this form enforces client-side.
function OptionGroupsEditor({ item }: { item: ResolvedMenuItem }) {
  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Size / flavour options</p>
      <div className="mt-1.5 flex flex-col gap-2">
        {item.optionGroups.map((group) => (
          <div key={group.id} className="rounded-lg border border-border/60 bg-background/50 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">
                {group.name}
                {group.required && <span className="ml-1 text-primary" title="Required">*</span>}
              </span>
              <form
                action={deleteOptionGroup.bind(null, group.id)}
                onSubmit={(e) => {
                  if (!confirm(`Remove the "${group.name}" option and all its choices?`)) e.preventDefault()
                }}
              >
                <button type="submit" className="text-[10px] font-bold text-muted-foreground underline hover:text-destructive">Remove</button>
              </form>
            </div>
            {group.choices.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {group.choices.map((choice) => (
                  <li key={choice.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {choice.name}
                      {choice.priceDelta !== 0 && ` (${choice.priceDelta > 0 ? '+' : '-'}Rs. ${Math.abs(choice.priceDelta)})`}
                    </span>
                    <form action={deleteOptionChoice.bind(null, choice.id)}>
                      <button type="submit" aria-label={`Remove ${choice.name}`} className="text-muted-foreground hover:text-destructive">✕</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <AddChoiceForm groupId={group.id} />
          </div>
        ))}
      </div>
      <AddGroupForm itemId={item.id} />
    </div>
  )
}

export function MenuManagementSection({ items }: { items: ResolvedMenuItem[] }) {
  const existingCategories = categoriesFromItems(items)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  // Falls back to the first real category once items load, without forcing
  // a re-render loop — a branch with zero items yet just shows no tabs.
  const currentCategory = activeCategory && existingCategories.includes(activeCategory) ? activeCategory : existingCategories[0]
  const categoryItems = items.filter((item) => item.category === currentCategory)

  return (
    <section>
      <h2 className="mb-4 font-serif text-xl font-black">Menu management ({items.length})</h2>

      <AddItemForm existingCategories={existingCategories} />

      {existingCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet — add the first one above. Typing a new category name creates it.</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-sm">
            {existingCategories.map((category) => {
              const count = items.filter((item) => item.category === category).length
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    currentCategory === category ? 'bg-secondary text-secondary-foreground shadow-sm' : 'bg-background text-muted-foreground hover:bg-secondary/30'
                  }`}
                >
                  <span>{getCategoryEmoji(category)}</span>
                  {category}
                  <span className="text-xs opacity-60">({count})</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categoryItems.map((item) => {
              const soldOut = !item.available

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

                  <OptionGroupsEditor item={item} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
