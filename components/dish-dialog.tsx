'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Minus, Plus, X } from 'lucide-react'
import type { MenuItem } from '@/lib/menu-data'
import { categoryEmoji } from '@/lib/menu-data'

type DishDialogProps = {
  dish: MenuItem | null
  available: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (id: number, quantity: number) => void
}

export function DishDialog({ dish, available, open, onOpenChange, onAddToCart }: DishDialogProps) {
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (open) setQuantity(1)
  }, [open, dish?.id])

  if (!dish) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[90] bg-foreground/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Viewport className="fixed inset-0 z-[91] flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-md overflow-hidden rounded-3xl border border-border/40 bg-card/40 shadow-2xl backdrop-blur-md outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <div className="relative aspect-[4/3] w-full bg-secondary/20">
              {dish.image ? (
                <img src={dish.image} alt={dish.name} className={`h-full w-full object-contain p-8 ${available ? '' : 'opacity-50 grayscale'}`} />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-7xl ${available ? '' : 'opacity-50 grayscale'}`}>{categoryEmoji[dish.category]}</div>
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

            <div className="p-6">
              <Dialog.Title className="font-serif text-2xl font-black">{dish.name}</Dialog.Title>
              <Dialog.Description dir="auto" className="mt-1 text-sm leading-6 text-muted-foreground">{dish.subtitle}</Dialog.Description>

              <div className="mt-5 flex items-center justify-between">
                <span className="font-serif text-2xl font-black text-primary">Rs. {dish.price}</span>
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
                <button
                  onClick={() => {
                    onAddToCart(dish.id, quantity)
                    onOpenChange(false)
                  }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110"
                >
                  Add to order · Rs. {dish.price * quantity}
                </button>
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
