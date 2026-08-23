import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { banCustomer, unbanCustomer } from '@/app/admin/actions'

const CUSTOMERS_LIMIT = 50

type CustomerRow = {
  phone: string
  name: string | null
  is_banned: boolean
  ban_reason: string | null
  created_at: string
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''
  const admin = createAdminClient()

  let customersQuery = admin.from('customers').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  customersQuery = query ? customersQuery.ilike('phone', `%${query}%`).limit(200) : customersQuery.limit(CUSTOMERS_LIMIT)

  const { data: customers, count: customersCount } = await customersQuery.returns<CustomerRow[]>()

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-black">
          Customers {typeof customersCount === 'number' && <span className="text-sm font-normal text-muted-foreground">({customersCount} total)</span>}
        </h2>
        <form className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by phone, e.g. 03…"
            className="w-56 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button type="submit" className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground transition hover:brightness-95">Search</button>
          {query && <Link href="/admin/customers" className="text-xs font-bold text-muted-foreground underline">Clear</Link>}
        </form>
      </div>

      {!query && (customersCount ?? 0) > CUSTOMERS_LIMIT && (
        <p className="mb-3 text-xs text-muted-foreground">Showing the latest {CUSTOMERS_LIMIT} customers — search by phone number to find someone specific.</p>
      )}

      <div className="flex flex-col gap-2">
        {(customers ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">{query ? <>No customers match &quot;{query}&quot;.</> : 'No customers yet.'}</p>
        )}
        {(customers ?? []).map((customer) => (
          <div key={customer.phone} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
            <Link href={`/admin/customers/${encodeURIComponent(customer.phone)}`} className="flex flex-1 flex-wrap items-center gap-4">
              <span className="font-bold">{customer.phone}</span>
              <span className="text-sm text-muted-foreground">{customer.name ?? 'No name on file'}</span>
              {customer.is_banned
                ? <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">Banned{customer.ban_reason ? ` — ${customer.ban_reason}` : ''}</span>
                : <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">Active</span>}
            </Link>
            {customer.is_banned ? (
              <form action={unbanCustomer.bind(null, customer.phone)}>
                <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-secondary">Unban</button>
              </form>
            ) : (
              <form action={banCustomer.bind(null, customer.phone)} className="flex items-center gap-2">
                <input name="reason" placeholder="Reason (optional)" className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
                <button type="submit" className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110">Ban</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
