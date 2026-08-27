import { createAdminClient } from '@/lib/supabase/admin'
import { MenuManagementSection, type AdminMenuItem } from '@/components/admin/menu-availability'

export default async function AdminMenuPage() {
  const admin = createAdminClient()

  const { data: items } = await admin
    .from('menu_items')
    .select('id, category, name, subtitle, price, image, is_available')
    .order('id')
    .returns<AdminMenuItem[]>()

  return <MenuManagementSection items={items ?? []} />
}
