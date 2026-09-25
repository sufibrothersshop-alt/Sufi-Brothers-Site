import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MenuManagementSection } from '@/components/admin/menu-availability'
import { MENU_ITEM_SELECT, toResolvedMenuItem, type MenuItemRow } from '@/lib/menu-item-row'

export default async function AdminMenuPage() {
  const branch = await requireAdmin()
  const admin = createAdminClient()

  const { data } = await admin
    .from('menu_items')
    .select(MENU_ITEM_SELECT)
    .eq('branch', branch)
    .order('id')
    .returns<MenuItemRow[]>()

  const { data: iconRows } = await admin.from('category_icons').select('category, emoji').eq('branch', branch)
  const categoryIcons: Record<string, string> = Object.fromEntries((iconRows ?? []).map((row) => [row.category, row.emoji]))

  return <MenuManagementSection items={(data ?? []).map(toResolvedMenuItem)} categoryIcons={categoryIcons} />
}
