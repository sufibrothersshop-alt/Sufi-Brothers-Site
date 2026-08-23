import { createAdminClient } from '@/lib/supabase/admin'
import { MenuAvailabilitySection } from '@/components/admin/menu-availability'

export default async function AdminMenuPage() {
  const admin = createAdminClient()

  const { data: availabilityRows } = await admin
    .from('menu_availability')
    .select('item_id, is_available, price_override')
    .returns<{ item_id: number; is_available: boolean; price_override: number | null }[]>()

  const overrides: Record<number, { is_available: boolean; price_override: number | null }> = {}
  for (const row of availabilityRows ?? []) {
    overrides[row.item_id] = { is_available: row.is_available, price_override: row.price_override }
  }

  return <MenuAvailabilitySection overrides={overrides} />
}
