import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { HomePage } from '@/components/home-page'
import { BRANCHES, branchName, isBranch, type Branch } from '@/lib/branches'
import type { ResolvedMenuItem } from '@/lib/use-resolved-menu'

type MenuItemRow = {
  id: number
  category: string
  name: string
  subtitle: string
  price: number
  image: string | null
  is_available: boolean
}

// Prerenders both known branches at build time — this is what makes each
// branch's page a plain cached (ISR) page instead of a per-request render.
export function generateStaticParams() {
  return BRANCHES.map((b) => ({ branch: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ branch: string }> }): Promise<Metadata> {
  const { branch } = await params
  if (!isBranch(branch)) return {}
  const name = branchName(branch)
  return {
    title: `Sufi Brothers | Fresh Fast Food in ${name}`,
    description: `Order fresh burgers, shawarmas, roll parathas and deals from Sufi Brothers — ${name} branch.`,
  }
}

// Menu is fetched server-side so it's already in the HTML on first paint,
// and the page is cached (ISR) so visitors get it from the CDN edge instead
// of waiting on a per-request render + Supabase round trip. Admin menu
// actions call revalidatePath(`/${branch}`) so edits show up immediately;
// the 5-minute revalidate is only a backstop, and the client re-fetches
// live availability/prices on mount regardless.
export const revalidate = 300

export default async function Page({ params }: { params: Promise<{ branch: string }> }) {
  const { branch: rawBranch } = await params
  if (!isBranch(rawBranch)) notFound()
  const branch: Branch = rawBranch

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('menu_items')
    .select('id, category, name, subtitle, price, image, is_available')
    .eq('branch', branch)
    .order('id')
    .returns<MenuItemRow[]>()

  // Throw rather than render an empty menu: a failed render keeps serving the
  // last good cached page, whereas an empty one would get cached itself.
  if (error) throw new Error(`Failed to load menu: ${error.message}`)

  const initialMenuItems: ResolvedMenuItem[] = (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    subtitle: row.subtitle,
    price: row.price,
    image: row.image,
    available: row.is_available,
  }))

  return <HomePage branch={branch} initialMenuItems={initialMenuItems} />
}
