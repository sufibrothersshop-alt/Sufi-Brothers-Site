import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PrintSlip } from '@/components/admin/print-slip'

type SlipOrder = {
  id: string
  customer_phone: string
  delivery_address: string | null
  notes: string | null
  delivery_fee: number
  total_amount: number
  created_at: string
  order_items: { item_name: string; quantity: number; line_total: number }[]
}

export default async function PrintSlipPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  await requireAdmin()
  const { orderId } = await params
  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, customer_phone, delivery_address, notes, delivery_fee, total_amount, created_at, order_items(item_name, quantity, line_total)')
    .eq('id', orderId)
    .maybeSingle<SlipOrder>()

  if (!order) notFound()

  return <PrintSlip order={order} />
}
