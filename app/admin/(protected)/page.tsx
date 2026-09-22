import { createAdminClient } from '@/lib/supabase/admin'
import { setDeliveryEnabled } from '@/app/admin/actions'
import { OrderCard, type OrderRow, type RiderInfo } from '@/components/admin/order-card'
import { StatTile } from '@/components/admin/stat-tile'
import { AutoPrintNewOrders } from '@/components/admin/auto-print-new-orders'
import { ResetStalePendingOrders } from '@/components/admin/reset-stale-pending'

const RECENT_ORDERS_LIMIT = 50
const PAGE_SIZE = 1000 // Supabase's API never returns more rows than this per request
const STALE_PENDING_HOURS = 24

// A plain `select('status, total_amount')` silently stops at PAGE_SIZE rows, so
// summing it froze "Total orders" at 1000 and undercounted pending + revenue.
// Counts come from the database exactly; revenue is summed page by page (all
// pages fetched in parallel once the count is known). If any page fails,
// revenue is null (shown as "—") rather than a quietly-wrong total.
async function getOrderStats(admin: ReturnType<typeof createAdminClient>) {
  const [{ count: total }, { count: pending }, { count: billable }] = await Promise.all([
    admin.from('orders').select('*', { count: 'exact', head: true }),
    admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('orders').select('*', { count: 'exact', head: true }).neq('status', 'cancelled'),
  ])

  const pages = await Promise.all(
    Array.from({ length: Math.ceil((billable ?? 0) / PAGE_SIZE) }, (_, i) =>
      admin
        .from('orders')
        .select('total_amount')
        .neq('status', 'cancelled')
        .order('created_at')
        .order('id') // tiebreaker so pages never overlap or skip rows
        .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
        .returns<{ total_amount: number }[]>()
    )
  )

  const failed = pages.some(({ error }) => error)
  const revenue = failed ? null : pages.reduce((sum, { data }) => sum + (data ?? []).reduce((s, o) => s + o.total_amount, 0), 0)

  return { totalOrders: total ?? 0, pendingOrders: pending ?? 0, revenue }
}

export default async function AdminOrdersPage() {
  const admin = createAdminClient()

  const staleCutoff = new Date(Date.now() - STALE_PENDING_HOURS * 60 * 60 * 1000).toISOString()

  const [{ data: recentOrders }, { totalOrders, pendingOrders, revenue }, { count: bannedCount }, { data: riders }, { data: settings }, { count: stalePendingCount }] = await Promise.all([
    admin
      .from('orders')
      .select('*, order_items(*), rider:riders(id, name, phone)')
      .order('created_at', { ascending: false })
      .limit(RECENT_ORDERS_LIMIT)
      .returns<OrderRow[]>(),
    getOrderStats(admin),
    admin.from('customers').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    admin.from('riders').select('id, name, phone').eq('is_active', true).order('name').returns<RiderInfo[]>(),
    admin.from('site_settings').select('delivery_enabled').eq('id', 1).maybeSingle<{ delivery_enabled: boolean }>(),
    admin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending').lt('created_at', staleCutoff),
  ])

  const deliveryEnabled = settings?.delivery_enabled ?? true
  const pendingOrdersForAlerts = (recentOrders ?? [])
    .filter((o) => o.status === 'pending')
    .map((o) => ({ id: o.id, deliveryFee: o.delivery_fee }))

  return (
    <>
      <AutoPrintNewOrders pendingOrders={pendingOrdersForAlerts} />

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
        <StatTile label="Revenue" value={revenue === null ? '—' : `Rs. ${revenue}`} tone="gold" />
        <StatTile label="Banned customers" value={String(bannedCount ?? 0)} tone="plain" />
      </section>

      {stalePendingCount !== null && stalePendingCount > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Stuck pending orders</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{stalePendingCount} pending order{stalePendingCount > 1 ? 's have' : ' has'} sat untouched for over 24 hours — likely stale or test orders.</p>
          </div>
          <ResetStalePendingOrders count={stalePendingCount} />
        </section>
      )}

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
