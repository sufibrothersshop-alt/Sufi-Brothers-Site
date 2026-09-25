'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Check, Minus, Plus, X } from 'lucide-react'
import type { MenuItem } from '@/lib/menu-data'
import { getCategoryEmoji } from '@/lib/menu-data'
import { lineUnitPrice } from '@/lib/cart'

type DishDialogProps = {
  dish: MenuItem | null
  available: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (id: number, choiceIds: number[], quantity: number) => void
  categoryIcons?: Record<string, string>
}

export function DishDialog({ dish, available, open, onOpenChange, onAddToCart, categoryIcons }: DishDialogProps) {
  const [quantity, setQuantity] = useState(1)
  // groupId -> chosen choiceId. Reset whenever a different dish opens so a
  // previous dish's picks never leak onto this one.
  const [selected, setSelected] = useState<Record<number, number>>({})

  useEffect(() => {
    if (open) {
      setQuantity(1)
      setSelected({})
    }
  }, [open, dish?.id])

  if (!dish) return null

  const choiceIds = Object.values(selected)
  const unitPrice = lineUnitPrice(dish, choiceIds)
  const missingRequiredGroup = dish.optionGroups.find((g) => g.required && selected[g.id] == null)
  const canAdd = available && !missingRequiredGroup

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[90] bg-foreground/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Viewport className="fixed inset-0 z-[91] flex items-center justify-center p-3 sm:p-4">
          <Dialog.Popup className="flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border/40 bg-card/40 shadow-2xl backdrop-blur-md outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <div className="relative h-40 w-full shrink-0 bg-secondary/20 sm:h-52">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className={`h-full w-full object-cover ${available ? '' : 'opacity-50 grayscale'}`} />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-5xl sm:text-7xl ${available ? '' : 'opacity-50 grayscale'}`}>{getCategoryEmoji(dish.category, categoryIcons)}</div>
              )}
              {!available && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-foreground/80 py-2 text-center text-xs font-black uppercase tracking-widest text-background">Sold out</span>}
              <Dialog.Close
                aria-label="Close"
                className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow transition hover:bg-card"
              >
                <X className="size-4" />
              </Dialog.Close>
              <span className="absolute bottom-3 left-3 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{dish.category}</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <Dialog.Title className="font-serif text-2xl font-black">{dish.name}</Dialog.Title>
              <Dialog.Description dir="auto" className="mt-1 text-sm leading-6 text-muted-foreground">{dish.subtitle}</Dialog.Description>

              {available && dish.optionGroups.map((group) => (
                <div key={group.id} className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {group.name}{group.required && <span className="ml-1 text-primary">*</span>}
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {group.choices.map((choice) => {
                      const isSelected = selected[group.id] === choice.id
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => setSelected((s) => ({ ...s, [group.id]: choice.id }))}
                          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition ${
                            isSelected ? 'border-primary bg-primary/10 font-bold text-primary' : 'border-border hover:bg-secondary/30'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`flex size-4 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                              {isSelected && <Check className="size-3" />}
                            </span>
                            {choice.name}
                          </span>
                          {choice.priceDelta !== 0 && (
                            <span className="text-xs text-muted-foreground">{choice.priceDelta > 0 ? `+Rs. ${choice.priceDelta}` : `-Rs. ${Math.abs(choice.priceDelta)}`}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="mt-5 flex items-center justify-between">
                <span className="font-serif text-2xl font-black text-primary">Rs. {unitPrice}</span>
                {available && (
                  <div className="flex items-center gap-3 rounded-xl border border-border p-1">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex size-8 items-center justify-center rounded-lg text-foreground transition hover:bg-secondary disabled:opacity-40"
                      disabled={quantity <= 1}
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="flex size-8 items-center justify-center rounded-lg text-foreground transition hover:bg-secondary"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                )}
              </div>

              {available ? (
                <>
                  {missingRequiredGroup && <p className="mt-3 text-xs font-bold text-destructive">Please choose a {missingRequiredGroup.name.toLowerCase()}.</p>}
                  <button
                    onClick={() => {
                      onAddToCart(dish.id, choiceIds, quantity)
                      onOpenChange(false)
                    }}
                    disabled={!canAdd}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
                  >
                    Add to order · Rs. {unitPrice * quantity}
                  </button>
                </>
              ) : (
                <p className="mt-6 rounded-xl bg-secondary px-4 py-3.5 text-center text-sm font-bold text-secondary-foreground">Currently unavailable</p>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
