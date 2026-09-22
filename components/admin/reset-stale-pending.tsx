'use client'

import { cancelStalePendingOrders } from '@/app/admin/actions'

export function ResetStalePendingOrders({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <form
      action={cancelStalePendingOrders}
      onSubmit={(e) => {
        if (!confirm(`Cancel ${count} pending order${count > 1 ? 's' : ''} older than 24 hours? This won't touch anything placed more recently.`)) {
          e.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-2.5 text-sm font-bold text-destructive shadow-sm transition hover:brightness-95"
      >
        Reset {count} stale pending order{count > 1 ? 's' : ''}
      </button>
    </form>
  )
}
