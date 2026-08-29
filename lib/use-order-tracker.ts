'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ActiveOrder = {
  id: string
  placedAt: number
  total: number
}

const STORAGE_KEY = 'sufi-active-order'
const POLL_MS = 15000

export const ORDER_PHASES = [
  { key: 'processing', label: 'Processing your order', minutes: 5 },
  { key: 'cooking', label: 'Cooking', minutes: 15 },
  { key: 'delivery', label: 'Out for delivery', minutes: 15 },
] as const

export const TOTAL_ORDER_MINUTES = ORDER_PHASES.reduce((sum, phase) => sum + phase.minutes, 0)

const PHASE_UPPER_BOUNDS = (() => {
  const bounds: number[] = []
  let acc = 0
  for (const phase of ORDER_PHASES) {
    acc += phase.minutes
    bounds.push(acc)
  }
  return bounds
})() // [5, 20, 35]
const PHASE_LOWER_BOUNDS = [0, ...PHASE_UPPER_BOUNDS.slice(0, -1)] // [0, 5, 20]

// How long past "delivered" a stale tracker is still allowed to show before
// we stop restoring it on page load (covers a browser left open overnight).
const STALE_AFTER_MINUTES = TOTAL_ORDER_MINUTES + 60

function statusToPhase(status: string): number | 'done' | 'cancelled' {
  switch (status) {
    case 'preparing':
      return 1
    case 'out_for_delivery':
      return 2
    case 'delivered':
      return 'done'
    case 'cancelled':
      return 'cancelled'
    default:
      return 0 // pending, confirmed
  }
}

type PolledStatus = { status: string; riderName: string | null; riderPhone: string | null }

export function useOrderTracker() {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [polled, setPolled] = useState<PolledStatus | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as ActiveOrder
      const elapsedMinutes = (Date.now() - parsed.placedAt) / 60000
      if (elapsedMinutes < STALE_AFTER_MINUTES) {
        setActiveOrder(parsed)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, [])

  useEffect(() => {
    if (!activeOrder) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [activeOrder])

  // Polls the real order status/rider instead of relying purely on a timer —
  // the timer alone can't know if the kitchen is running early or late.
  useEffect(() => {
    if (!activeOrder) {
      setPolled(null)
      return
    }
    let cancelled = false
    const poll = async () => {
      const supabase = createClient()
      const { data } = await supabase.rpc('get_order_status', { p_order_id: activeOrder.id })
      const row = data?.[0]
      if (!cancelled && row) {
        setPolled({ status: row.status, riderName: row.rider_name, riderPhone: row.rider_phone })
      }
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [activeOrder])

  const startTracking = useCallback((id: string, total: number) => {
    const order: ActiveOrder = { id, placedAt: Date.now(), total }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    } catch {
      // ignore
    }
    setNow(Date.now())
    setPolled(null)
    setActiveOrder(order)
  }, [])

  const clearTracking = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setActiveOrder(null)
  }, [])

  const elapsedMinutes = activeOrder ? (now - activeOrder.placedAt) / 60000 : 0
  const timerPhaseIndex = PHASE_UPPER_BOUNDS.findIndex((upper) => elapsedMinutes < upper)
  const realPhase = polled ? statusToPhase(polled.status) : null

  const isCancelled = realPhase === 'cancelled'
  const isDelivered = realPhase === 'done' || (realPhase === null && elapsedMinutes >= TOTAL_ORDER_MINUTES)

  const currentPhaseIndex =
    typeof realPhase === 'number' ? realPhase : realPhase === 'done' ? ORDER_PHASES.length - 1 : timerPhaseIndex === -1 ? ORDER_PHASES.length - 1 : timerPhaseIndex

  // Progress is capped within the confirmed phase's slice of the ring — a
  // status update always wins, the timer just animates smoothly inside it.
  let progress = 1
  if (!isDelivered) {
    const lower = PHASE_LOWER_BOUNDS[currentPhaseIndex]
    const upper = PHASE_UPPER_BOUNDS[currentPhaseIndex]
    const withinPhase = Math.min(Math.max(elapsedMinutes - lower, 0), upper - lower)
    progress = (lower + withinPhase) / TOTAL_ORDER_MINUTES
  }

  const remainingMinutes = Math.max(0, Math.ceil(TOTAL_ORDER_MINUTES - elapsedMinutes))

  return {
    activeOrder,
    startTracking,
    clearTracking,
    progress,
    remainingMinutes,
    currentPhaseIndex,
    isDelivered,
    isCancelled,
    riderName: polled?.riderName ?? null,
    riderPhone: polled?.riderPhone ?? null,
  }
}
