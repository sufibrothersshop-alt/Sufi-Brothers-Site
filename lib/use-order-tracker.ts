'use client'

import { useCallback, useEffect, useState } from 'react'

export type ActiveOrder = {
  id: string
  placedAt: number
  total: number
}

const STORAGE_KEY = 'sufi-active-order'

export const ORDER_PHASES = [
  { key: 'processing', label: 'Processing your order', minutes: 5 },
  { key: 'cooking', label: 'Cooking', minutes: 20 },
  { key: 'delivery', label: 'Out for delivery', minutes: 20 },
] as const

export const TOTAL_ORDER_MINUTES = ORDER_PHASES.reduce((sum, phase) => sum + phase.minutes, 0)

// How long past "delivered" a stale tracker is still allowed to show before
// we stop restoring it on page load (covers a browser left open overnight).
const STALE_AFTER_MINUTES = TOTAL_ORDER_MINUTES + 60

export function useOrderTracker() {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null)
  const [now, setNow] = useState(() => Date.now())

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

  const startTracking = useCallback((id: string, total: number) => {
    const order: ActiveOrder = { id, placedAt: Date.now(), total }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    } catch {
      // ignore
    }
    setNow(Date.now())
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
  const progress = activeOrder ? Math.min(1, elapsedMinutes / TOTAL_ORDER_MINUTES) : 0
  const isDelivered = elapsedMinutes >= TOTAL_ORDER_MINUTES
  const remainingMinutes = Math.max(0, Math.ceil(TOTAL_ORDER_MINUTES - elapsedMinutes))

  let currentPhaseIndex = ORDER_PHASES.length - 1
  let boundary = 0
  for (let i = 0; i < ORDER_PHASES.length; i++) {
    boundary += ORDER_PHASES[i].minutes
    if (elapsedMinutes < boundary) {
      currentPhaseIndex = i
      break
    }
  }

  return {
    activeOrder,
    startTracking,
    clearTracking,
    progress,
    remainingMinutes,
    currentPhaseIndex,
    isDelivered,
  }
}
