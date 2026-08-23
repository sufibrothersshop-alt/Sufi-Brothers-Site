import { createAdminClient } from '@/lib/supabase/admin'
import { setDeliveryEnabled } from '@/app/admin/actions'
import { OrderCard, type OrderRow, type RiderInfo } from '@/components/admin/order-card'
import { StatTile } from '@/components/admin/stat-tile'

const RECENT_ORDERS_LIMIT = 50

export default async function AdminOrdersPage() {
  const admin = createAdminClient()

  const [{ data: recentOrders }, { data: orderTotals }, { count: bannedCount }, { data: riders }, { data: settings }] = await Promise.all([
    admin
      .from('orders')
      .select('*, order_items(*), rider:riders(id, name, phone)')
      .order('created_at', { ascending: false })
      .limit(RECENT_ORDERS_LIMIT)
      .returns<OrderRow[]>(),
    admin.from('orders').select('status, total_amount').returns<{ status: string; total_amount: number }[]>(),
    admin.from('customers').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    admin.from('riders').select('id, name, phone').eq('is_active', true).order('name').returns<RiderInfo[]>(),
    admin.from('site_settings').select('delivery_enabled').eq('id', 1).maybeSingle<{ delivery_enabled: boolean }>(),
  ])

  const deliveryEnabled = settings?.delivery_enabled ?? true
  const totalOrders = orderTotals?.length ?? 0
  const pendingOrders = (orderTotals ?? []).filter((o) => o.status === 'pending').length
  const revenue = (orderTotals ?? []).filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0)

  return (
    <>
      <section className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5 ${deliveryEnabled ? 'border-border bg-card' : 'border-destructive/30 bg-destructive/10'}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Delivery service</p>
          <p className={`mt-0.5 font-serif text-lg font-black ${deliveryEnabled ? '' : 'text-destructive'}`}>{deliveryEnabled ? 'Taking orders' : 'Delivery is OFF'}</p>
        </div>
        <form action={setDeliveryEnabled.bind(null, !deliveryEnabled)}>
          <button
            type="submit"
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 ${
              deliveryEnabled ? 'bg-destructive shadow-destructive/20' : 'bg-green-600 shadow-green-600/20'
            }`}
          >
            {deliveryEnabled ? 'Turn delivery off' : 'Turn delivery on'}
          </button>
        </form>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total orders" value={String(totalOrders)} tone="gold" />
        <StatTile label="Pending orders" value={String(pendingOrders)} tone="red" />
        <StatTile label="Revenue" value={`Rs. ${revenue}`} tone="gold" />
        <StatTile label="Banned customers" value={String(bannedCount ?? 0)} tone="plain" />
      </section>

      <section>
        <h2 className="mb-4 font-serif text-xl font-black">
          Orders {totalOrders > RECENT_ORDERS_LIMIT && <span className="text-sm font-normal text-muted-foreground">(latest {RECENT_ORDERS_LIMIT} of {totalOrders})</span>}
        </h2>
        <div className="flex flex-col gap-4">
          {(recentOrders ?? []).length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          {(recentOrders ?? []).map((order) => (
            <OrderCard key={order.id} order={order} riders={riders ?? []} />
          ))}
        </div>
      </section>
    </>
  )
}
