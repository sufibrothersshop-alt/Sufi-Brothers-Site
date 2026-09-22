import Link from 'next/link'
import { MapPin, Utensils } from 'lucide-react'
import { BRANCHES } from '@/lib/branches'

// No data fetching here on purpose — the branch list is fixed in code, so
// this page is fully static and never waits on anything. Each branch's own
// menu page (app/[branch]/page.tsx) is where the real (cached) data lives.
export default function BranchPickerPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-5 py-16 text-foreground">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Utensils className="size-7" />
        </span>
        <h1 className="font-serif text-3xl font-black sm:text-4xl">Sufi Brothers</h1>
        <p className="max-w-xs text-sm text-muted-foreground">Choose your nearest branch to see its menu and order.</p>
      </div>

      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        {BRANCHES.map((b) => (
          <Link
            key={b.slug}
            href={`/${b.slug}`}
            className="group flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-8 text-center shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-xl hover:shadow-primary/10"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <MapPin className="size-6" />
            </span>
            <span className="font-serif text-xl font-black">{b.name}</span>
            <span className="text-xs font-bold uppercase tracking-wide text-primary">Order from here →</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
