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

// Menu items are fetched server-side so the menu is already in the HTML on
// first paint (instead of the page rendering empty until the client fetches
// menu_items after hydration). Forced dynamic so an admin's add/price/sold-
// out change is visible on the very next request, not stuck behind a stale
// prerendered shell.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const admin = createAdminClient()

  const { data } = await admin
    .from('menu_items')
    .select('id, category, name, subtitle, price, image, is_available')
    .order('id')
    .returns<MenuItemRow[]>()

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
