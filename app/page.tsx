import { createAdminClient } from '@/lib/supabase/admin'
import { HomePage } from '@/components/home-page'
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

// The menu is fetched server-side so it's already in the HTML on first paint,
// and the page is cached (ISR) so visitors get it from the CDN edge instead
// of waiting on a per-request render + Supabase round trip (force-dynamic
// made every open cost ~1-2s on mobile). Admin menu actions call
// revalidatePath('/') so edits show up immediately; the 5-minute revalidate
// is only a backstop, and the client re-fetches live availability/prices on
// mount regardless.
export const revalidate = 300

export default async function Page() {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('menu_items')
    .select('id, category, name, subtitle, price, image, is_available')
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

  return <HomePage initialMenuItems={initialMenuItems} />
}
