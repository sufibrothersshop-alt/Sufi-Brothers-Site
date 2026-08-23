import { createAdminClient } from '@/lib/supabase/admin'
import { addRider, setRiderActive } from '@/app/admin/actions'

type RiderRow = { id: string; name: string; phone: string; is_active: boolean; created_at: string }

export default async function AdminRidersPage() {
  const admin = createAdminClient()
  const { data: riders } = await admin.from('riders').select('*').order('created_at', { ascending: false }).returns<RiderRow[]>()

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 font-serif text-xl font-black">Add a rider</h2>
        <form action={addRider} className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rider-name" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Name</label>
            <input id="rider-name" name="name" required placeholder="e.g. Ahmed" className="w-48 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rider-phone" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Phone (WhatsApp)</label>
            <input id="rider-phone" name="phone" type="tel" required placeholder="03xxxxxxxxx" className="w-48 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <button type="submit" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110">Add rider</button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-xl font-black">Riders ({riders?.length ?? 0})</h2>
        <div className="flex flex-col gap-2">
          {(riders ?? []).length === 0 && <p className="text-sm text-muted-foreground">No riders added yet.</p>}
          {(riders ?? []).map((rider) => (
            <div key={rider.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-bold">{rider.name}</span>
                <span className="text-sm text-muted-foreground">{rider.phone}</span>
                {rider.is_active
                  ? <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">Active</span>
                  : <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">Inactive</span>}
              </div>
              <form action={setRiderActive.bind(null, rider.id, !rider.is_active)}>
                <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-secondary">
                  {rider.is_active ? 'Mark inactive' : 'Mark active'}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
