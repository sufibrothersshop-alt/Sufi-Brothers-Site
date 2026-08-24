import Link from 'next/link'
import { MessageCircle, Printer } from 'lucide-react'
import { assignRider, updateDeliveryFee } from '@/app/admin/actions'
import { OrderStatusForm } from '@/components/admin/order-status-form'
import { buildWhatsAppLink } from '@/lib/whatsapp'

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-secondary text-secondary-foreground',
  confirmed: 'bg-primary/10 text-primary',
  preparing: 'bg-primary/10 text-primary',
  out_for_delivery: 'bg-primary/10 text-primary',
  delivered: 'bg-foreground text-background',
  cancelled: 'bg-destructive/10 text-destructive',
}

export type OrderItemRow = { id: string; item_name: string; quantity: number; unit_price: number; line_total: number }
export type RiderInfo = { id: string; name: string; phone: string }
export type OrderRow = {
  id: string
  customer_phone: string
  status: string
  delivery_address: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  delivery_fee: number
  total_amount: number
  created_at: string
  order_items: OrderItemRow[]
  rider_id: string | null
  rider: RiderInfo | null
}

function buildRiderMessage(order: OrderRow) {
  const lines = [
    `New delivery — Order #${order.id.slice(0, 8)}`,
    `Customer: ${order.customer_phone}`,
    order.delivery_address ? `Address: ${order.delivery_address}` : null,
    order.latitude != null && order.longitude != null ? `Map: https://www.google.com/maps?q=${order.latitude},${order.longitude}` : null,
    '',
    'Items:',
    ...order.order_items.map((item) => `${item.quantity} x ${item.item_name}`),
    '',
    `Total: Rs. ${order.total_amount}`,
    order.notes ? `Note: ${order.notes}` : null,
  ]
  return lines.filter((line) => line !== null).join('\n')
}

function buildCustomerMessage(order: OrderRow) {
  const lines = [
    `Hi! Your Sufi Brothers order #${order.id.slice(0, 8)} is on the way.`,
    order.rider ? `Rider: ${order.rider.name} (${order.rider.phone})` : null,
    `Delivery charges: Rs. ${order.delivery_fee}`,
    `Total: Rs. ${order.total_amount}`,
    'Thank you for ordering with us!',
  ]
  return lines.filter((line) => line !== null).join('\n')
}

const COMPACT_STATUSES = new Set(['delivered', 'cancelled'])

export function OrderCard({ order, riders, showCustomer = true }: { order: OrderRow; riders: RiderInfo[]; showCustomer?: boolean }) {
  if (COMPACT_STATUSES.has(order.status)) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {showCustomer ? (
            <Link href={`/admin/customers/${encodeURIComponent(order.customer_phone)}`} className="font-bold text-primary hover:underline">
              {order.customer_phone}
            </Link>
          ) : (
            <span className="font-bold">Order #{order.id.slice(0, 8)}</span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${STATUS_BADGE[order.status] ?? 'bg-secondary text-secondary-foreground'}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-primary">Rs. {order.total_amount}</span>
          <OrderStatusForm orderId={order.id} currentStatus={order.status} compact />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {showCustomer ? (
              <Link href={`/admin/customers/${encodeURIComponent(order.customer_phone)}`} className="font-bold text-primary hover:underline">
                {order.customer_phone}
              </Link>
            ) : (
              <p className="font-bold">Order #{order.id.slice(0, 8)}</p>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${STATUS_BADGE[order.status] ?? 'bg-secondary text-secondary-foreground'}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
          {order.delivery_address && <p className="mt-1 text-sm">{order.delivery_address}</p>}
          {order.latitude != null && order.longitude != null && (
            <a
              className="text-xs font-bold text-primary underline"
              href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              View pinned location
            </a>
          )}
          {order.notes && <p className="mt-1 text-xs italic text-muted-foreground">Note: {order.notes}</p>}
        </div>
        <div className="text-right">
          <p className="font-serif text-xl font-black text-primary">Rs. {order.total_amount}</p>
          <OrderStatusForm orderId={order.id} currentStatus={order.status} />
          <a
            href={`/admin/print/${order.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-end gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <Printer className="size-3.5" /> Print slip
          </a>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex justify-between text-muted-foreground">
            <span>{item.quantity} × {item.item_name}</span>
            <span>Rs. {item.line_total}</span>
          </li>
        ))}
        <li className="flex items-center justify-between text-muted-foreground">
          <span>Delivery</span>
          <form action={updateDeliveryFee.bind(null, order.id)} className="flex items-center gap-1.5">
            <span>Rs.</span>
            <input
              type="number"
              name="delivery_fee"
              min={0}
              step={1}
              defaultValue={order.delivery_fee}
              className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs font-bold text-foreground"
            />
            <button type="submit" className="rounded-lg border border-border px-2 py-1 text-xs font-bold transition hover:bg-secondary">Set</button>
          </form>
        </li>
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <form action={assignRider.bind(null, order.id)} className="flex items-center gap-2">
          <select name="rider_id" defaultValue={order.rider_id ?? ''} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-bold">
            <option value="">No rider assigned</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>{rider.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-secondary">Assign</button>
        </form>

        {order.rider && (
          <div className="flex flex-wrap gap-2">
            <a
              href={buildWhatsAppLink(order.rider.phone, buildRiderMessage(order))}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition hover:brightness-95"
            >
              <MessageCircle className="size-3.5" /> Message {order.rider.name}
            </a>
            <a
              href={buildWhatsAppLink(order.customer_phone, buildCustomerMessage(order))}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-secondary"
            >
              <MessageCircle className="size-3.5" /> Message customer
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
