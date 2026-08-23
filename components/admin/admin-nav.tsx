'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/riders', label: 'Riders' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-sm">
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary/60 text-secondary-foreground hover:bg-secondary'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
