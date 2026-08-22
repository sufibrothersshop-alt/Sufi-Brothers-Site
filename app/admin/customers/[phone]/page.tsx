import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { banCustomer, unbanCustomer } from '@/app/admin/actions'
import { OrderCard, type OrderRow } from '@/components/admin/order-card'
import { StatTile } from '@/components/admin/stat-tile'

type CustomerRow = {
  phone: string
  name: string | null
  is_banned: boolean
  ban_reason: string | null
  created_at: string
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ phone: string }>
}) {
  await requireAdmin()
  const { phone: rawPhone } = await params
  const phone = decodeURIComponent(rawPhone)
  const admin = createAdminClient()

  const [{ data: customer }, { data: orders }] = await Promise.all([
    admin.from('customers').select('*').eq('phone', phone).maybeSingle<CustomerRow>(),
    admin.from('orders').select('*, order_items(*)').eq('customer_phone', phone).order('created_at', { ascending: false }).returns<OrderRow[]>(),
  ])

  if (!customer) notFound()

  const allOrders = orders ?? []
  const totalOrders = allOrders.length
  const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled').length
  const totalPaid = allOrders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0)
  const latestLocation = allOrders.find((o) => o.delivery_address || (o.latitude != null && o.longitude != null))

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground lg:px-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-secondary pb-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">Customer profile</p>
            <h1 className="mt-1 font-serif text-3xl font-black">{customer.phone}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{customer.name ?? 'No name on file'} · Customer since {new Date(customer.created_at).toLocaleDateString()}</p>
          </div>
          {customer.is_banned ? (
            <form action={unbanCustomer.bind(null, customer.phone)} className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">Banned{customer.ban_reason ? ` — ${customer.ban_reason}` : ''}</span>
              <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-secondary">Unban this number</button>
            </form>
          ) : (
            <form action={banCustomer.bind(null, customer.phone)} className="flex items-center gap-2">
              <input name="reason" placeholder="Ban reason (optional)" className="w-40 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
              <button type="submit" className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110">Ban this number</button>
            </form>
          )}
        </div>

        <section className="grid grid-cols-3 gap-4">
          <StatTile label="Orders placed" value={String(totalOrders)} tone="gold" />
          <StatTile label="Cancelled" value={String(cancelledOrders)} tone="red" />
          <StatTile label="Total paid" value={`Rs. ${totalPaid}`} tone="plain" />
        </section>

        {latestLocation && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Most recent delivery location</p>
            {latestLocation.delivery_address && <p className="mt-1 text-sm font-bold">{latestLocation.delivery_address}</p>}
            {latestLocation.latitude != null && latestLocation.longitude != null && (
              <a
                className="mt-1 inline-block text-xs font-bold text-primary underline"
                href={`https://www.google.com/maps?q=${latestLocation.latitude},${latestLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                View pinned location
              </a>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-4 font-serif text-xl font-black">Order history</h2>
          <div className="flex flex-col gap-4">
            {allOrders.length === 0 && <p className="text-sm text-muted-foreground">No orders from this number yet.</p>}
            {allOrders.map((order) => <OrderCard key={order.id} order={order} showCustomer={false} />)}
          </div>
        </section>
      </div>
    </main>
  )
}
