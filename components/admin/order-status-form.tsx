'use client'

import { useState, useTransition } from 'react'
import { updateOrderStatus } from '@/app/admin/actions'
import { STATUS_LABELS } from '@/components/admin/order-card'

const STATUSES_REQUIRING_FEE = new Set(['confirmed', 'preparing', 'out_for_delivery', 'delivered'])

export function OrderStatusForm({
  orderId,
  currentStatus,
  deliveryFee,
  compact = false,
}: {
  orderId: string
  currentStatus: string
  deliveryFee: number
  compact?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(currentStatus)

  const blocked = STATUSES_REQUIRING_FEE.has(status) && deliveryFee <= 0

  const handleSubmit = (formData: FormData) => {
    if (blocked) return
    startTransition(async () => {
      await updateOrderStatus(orderId, formData)
    })
  }

  return (
    <div className={compact ? '' : 'mt-2'}>
      <form action={handleSubmit} className="flex items-center gap-2">
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`rounded-lg border border-border bg-background font-bold ${compact ? 'px-2 py-1 text-xs' : 'px-2 py-1.5 text-xs'}`}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending || blocked}
          title={blocked ? 'Set the delivery fee before moving this order forward' : undefined}
          className={`rounded-lg font-bold transition disabled:opacity-60 ${
            compact ? 'border border-border px-2 py-1 text-xs hover:bg-secondary' : 'bg-primary px-3 py-1.5 text-xs text-primary-foreground'
          }`}
        >
          {isPending ? '…' : 'Update'}
        </button>
      </form>
      {blocked && <p className="mt-1 text-[10px] font-bold text-destructive">Set delivery fee first</p>}
    </div>
  )
}
