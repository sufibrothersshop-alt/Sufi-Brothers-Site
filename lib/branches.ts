// The full branch list this app knows about — adding a third branch means
// adding its row to supabase/schema.sql's `branches` table, an entry here,
// its own ADMIN_<BRANCH>_USERNAME/PASSWORD pair (see lib/admin-auth.ts), and
// letting app/[branch]/page.tsx prerender it (see generateStaticParams
// there). Nothing else needs to change. No `server-only` here — the public
// branch-picker page and admin auth both need this.
export type Branch = 'ghouri-town' | 'khana'

export const BRANCHES: { slug: Branch; name: string; phone: string }[] = [
  { slug: 'ghouri-town', name: 'Ghouri Town', phone: '03447575657' },
  { slug: 'khana', name: 'Khana', phone: '03455411094' },
]

export function isBranch(value: string): value is Branch {
  return BRANCHES.some((b) => b.slug === value)
}

export function branchName(slug: Branch) {
  return BRANCHES.find((b) => b.slug === slug)?.name ?? slug
}

// Raw digits, no formatting — for tel: links.
export function branchPhone(slug: Branch) {
  return BRANCHES.find((b) => b.slug === slug)?.phone ?? ''
}

// "0345-5411094" style, for display.
export function branchPhoneDisplay(slug: Branch) {
  const phone = branchPhone(slug)
  return phone.length === 11 ? `${phone.slice(0, 4)}-${phone.slice(4)}` : phone
}
