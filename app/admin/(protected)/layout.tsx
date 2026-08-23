import { requireAdmin } from '@/lib/admin-auth'
import { signOut } from '@/app/admin/actions'
import { AdminNav } from '@/components/admin/admin-nav'
import { AutoRefresh } from '@/components/admin/auto-refresh'

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-secondary pb-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">Sufi Brothers</p>
            <h1 className="mt-1 font-serif text-3xl font-black">Admin</h1>
            <div className="mt-2">
              <AutoRefresh intervalMs={15000} />
            </div>
          </div>
          <form action={signOut}>
            <button type="submit" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:bg-secondary">Sign out</button>
          </form>
        </div>

        <AdminNav />

        {children}
      </div>
    </main>
  )
}
