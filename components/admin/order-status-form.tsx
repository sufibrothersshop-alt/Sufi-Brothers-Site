'use client'

import { useTransition } from 'react'
import { updateOrderStatus } from '@/app/admin/actions'
import { STATUS_LABELS } from '@/components/admin/order-card'

export function OrderStatusForm({ orderId, currentStatus, compact = false }: { orderId: string; currentStatus: string; compact?: boolean }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    const newStatus = String(formData.get('status') ?? '')
    startTransition(async () => {
      await updateOrderStatus(orderId, formData)
      // "Cooking started" — auto-open a print-ready 80mm slip. Once a
      // thermal printer is installed as a system printer this just prints;
      // until then it opens the browser's normal print dialog.
      if (newStatus === 'preparing') {
        window.open(`/admin/print/${orderId}`, '_blank', 'width=420,height=720')
      }
    })
  }

  return (
    <form action={handleSubmit} className={`flex items-center gap-2 ${compact ? '' : 'mt-2'}`}>
      <select
        name="status"
        defaultValue={currentStatus}
        className={`rounded-lg border border-border bg-background font-bold ${compact ? 'px-2 py-1 text-xs' : 'px-2 py-1.5 text-xs'}`}
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className={`rounded-lg font-bold transition disabled:opacity-60 ${
          compact ? 'border border-border px-2 py-1 text-xs hover:bg-secondary' : 'bg-primary px-3 py-1.5 text-xs text-primary-foreground'
        }`}
      >
        {isPending ? '…' : 'Update'}
      </button>
    </form>
  )
}
