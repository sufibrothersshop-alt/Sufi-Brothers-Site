import Link from 'next/link'
import { updateOrderStatus } from '@/app/admin/actions'

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
export type OrderRow = {
  id: string
  customer_phone: string
  status: string
  delivery_address: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  total_amount: number
  created_at: string
  order_items: OrderItemRow[]
}

export function OrderCard({ order, showCustomer = true }: { order: OrderRow; showCustomer?: boolean }) {
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
          <form action={updateOrderStatus.bind(null, order.id)} className="mt-2 flex items-center gap-2">
            <select name="status" defaultValue={order.status} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-bold">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Update</button>
          </form>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
        {order.order_items.map((item) => (
          <li key={item.id} className="flex justify-between text-muted-foreground">
            <span>{item.quantity} × {item.item_name}</span>
            <span>Rs. {item.line_total}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
