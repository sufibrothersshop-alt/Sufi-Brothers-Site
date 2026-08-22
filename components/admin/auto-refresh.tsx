'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Periodically re-runs the Server Component fetch (new orders, ban/status
// changes from another tab, etc.) without a full page reload or scroll jump.
// Not true realtime: a live Supabase subscription would need the browser to
// read `orders`/`customers` directly, which RLS deliberately blocks for the
// anon key since there's no per-admin Supabase session to scope a safe
// policy around (admin login is a plain cookie, not Supabase Auth).
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
      <span className="size-1.5 animate-pulse rounded-full bg-secondary" />
      Live — updates every {Math.round(intervalMs / 1000)}s
    </span>
  )
}
