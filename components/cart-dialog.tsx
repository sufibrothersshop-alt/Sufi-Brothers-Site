'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { CheckCircle2, LocateFixed, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import type { ResolvedMenuItem } from '@/lib/use-resolved-menu'
import { createClient } from '@/lib/supabase/client'
import { useRememberedCustomer } from '@/lib/use-remembered-customer'

const DELIVERY_FEE = 100
const FREE_DELIVERY_THRESHOLD = 1000

type CartDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  menuItems: ResolvedMenuItem[]
  cart: Record<number, number>
  onIncrement: (id: number) => void
  onDecrement: (id: number) => void
  onRemove: (id: number) => void
  onClear: () => void
  onOrderPlaced?: (orderId: string, total: number) => void
}

export function CartDialog({ open, onOpenChange, menuItems, cart, onIncrement, onDecrement, onRemove, onClear, onOrderPlaced }: CartDialogProps) {
  const lines = Object.entries(cart)
    .map(([id, quantity]) => ({ dish: menuItems.find((item) => item.id === Number(id)), quantity }))
    .filter((line): line is { dish: NonNullable<typeof line.dish>; quantity: number } => !!line.dish && line.quantity > 0)

  const subtotal = lines.reduce((sum, line) => sum + line.dish.price * line.quantity, 0)
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = subtotal + deliveryFee

  const [customerInfo, setCustomerInfo] = useRememberedCustomer()
  const { name, phone, address } = customerInfo
  const setName = (value: string) => setCustomerInfo((c) => ({ ...c, name: value }))
  const setPhone = (value: string) => setCustomerInfo((c) => ({ ...c, phone: value }))
  const setAddress = (value: string) => setCustomerInfo((c) => ({ ...c, address: value }))
  const [notes, setNotes] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setOrderId(null)
    }
  }, [open])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not available on this device.')
      return
    }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocationError('Could not get your location. You can still type your address below.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const placeOrder = async () => {
    if (!phone.trim() || !address.trim()) {
      setError('Phone number and delivery address are required.')
      return
    }
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('place_order', {
      p_phone: phone.trim(),
      p_name: name.trim() || null,
      p_address: address.trim(),
      p_notes: notes.trim() || null,
      p_items: lines.map(({ dish, quantity }) => ({ id: dish.id, name: dish.name, category: dish.category, unit_price: dish.price, quantity })),
      p_latitude: coords?.lat ?? null,
      p_longitude: coords?.lng ?? null,
    })

    setSubmitting(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setOrderId(data as string)
    onOrderPlaced?.(data as string, total)
    onClear()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[90] bg-foreground/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Viewport className="fixed inset-0 z-[91] flex items-center justify-center p-4">
          <Dialog.Popup className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border/40 bg-card/95 shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <Dialog.Title className="font-serif text-xl font-black">Your order</Dialog.Title>
              <Dialog.Close aria-label="Close" className="flex size-9 items-center justify-center rounded-full text-foreground transition hover:bg-secondary">
                <X className="size-4" />
              </Dialog.Close>
            </div>

            {orderId ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <CheckCircle2 className="size-12 text-primary" />
                <p className="font-serif text-lg font-black">Order placed!</p>
                <p className="text-sm text-muted-foreground">We'll call you shortly to confirm. Order #{orderId.slice(0, 8)}</p>
                <Dialog.Close className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Done</Dialog.Close>
              </div>
            ) : lines.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
                <ShoppingBag className="size-10 opacity-40" />
                <p className="text-sm">Your cart is empty. Add something tasty from the menu.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <ul className="flex flex-col gap-4">
                  {lines.map(({ dish, quantity }) => (
                    <li key={dish.id} className="flex items-center gap-3">
                      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary/30">
                        {dish.image ? <img src={dish.image} alt={dish.name} className="h-full w-full object-contain p-1.5" /> : <ShoppingBag className="size-6 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{dish.name}</p>
                        <p className="text-xs text-muted-foreground">Rs. {dish.price} each</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-border p-1">
                        <button aria-label={`Decrease ${dish.name}`} onClick={() => onDecrement(dish.id)} className="flex size-7 items-center justify-center rounded-lg transition hover:bg-secondary">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold">{quantity}</span>
                        <button aria-label={`Increase ${dish.name}`} onClick={() => onIncrement(dish.id)} className="flex size-7 items-center justify-center rounded-lg transition hover:bg-secondary">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button aria-label={`Remove ${dish.name}`} onClick={() => onRemove(dish.id)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required placeholder="Mobile number *" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Delivery address *" rows={2} className="resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                  <button type="button" onClick={useMyLocation} disabled={locating} className="flex items-center gap-2 self-start text-xs font-bold text-primary disabled:opacity-60">
                    <LocateFixed className="size-4" />
                    {locating ? 'Getting your location…' : coords ? 'Location pinned ✓' : 'Share my current location'}
                  </button>
                  {locationError && <p className="text-xs text-destructive">{locationError}</p>}
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions (optional)" className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
              </div>
            )}

            {lines.length > 0 && !orderId && (
              <div className="border-t border-border px-6 py-5">
                {error && <p className="mb-3 text-sm font-medium text-destructive">{error}</p>}
                <div className="mb-3 flex items-center justify-between">
                  <button onClick={onClear} className="text-xs font-bold text-muted-foreground underline">Clear cart</button>
                </div>
                <div className="mb-4 flex flex-col gap-1.5 rounded-xl bg-secondary/20 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span>{deliveryFee === 0 ? 'Free' : `Rs. ${deliveryFee}`}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <p className="text-xs text-muted-foreground/80">Add Rs. {FREE_DELIVERY_THRESHOLD - subtotal} more for free delivery</p>
                  )}
                  <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 font-serif text-lg font-black text-primary">
                    <span>Total</span>
                    <span>Rs. {total}</span>
                  </div>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? 'Placing order…' : `Place order · Rs. ${total}`}
                </button>
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
