import { createAdminClient } from '@/lib/supabase/admin'
import { OrderCard, type OrderRow, type RiderInfo } from '@/components/admin/order-card'
import { StatTile } from '@/components/admin/stat-tile'

const RECENT_ORDERS_LIMIT = 50

export default async function AdminOrdersPage() {
  const admin = createAdminClient()

  const [{ data: recentOrders }, { data: orderTotals }, { count: bannedCount }, { data: riders }] = await Promise.all([
    admin
      .from('orders')
      .select('*, order_items(*), rider:riders(id, name, phone)')
      .order('created_at', { ascending: false })
      .limit(RECENT_ORDERS_LIMIT)
      .returns<OrderRow[]>(),
    admin.from('orders').select('status, total_amount').returns<{ status: string; total_amount: number }[]>(),
    admin.from('customers').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    admin.from('riders').select('id, name, phone').eq('is_active', true).order('name').returns<RiderInfo[]>(),
  ])

  const totalOrders = orderTotals?.length ?? 0
  const pendingOrders = (orderTotals ?? []).filter((o) => o.status === 'pending').length
  const revenue = (orderTotals ?? []).filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0)

  return (
    <>
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
