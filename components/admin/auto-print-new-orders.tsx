'use client'

import { useEffect, useRef, useState } from 'react'

const SEEN_KEY = 'sufi-admin-printed-orders'

// Fires a 80mm kitchen slip the moment a new order lands — no click behind
// it, since it's driven by the page's own background refresh, not a user
// gesture. window.open() would get silently blocked by the popup blocker
// in that situation, so this prints through a hidden iframe instead: the
// print-slip page's own window.print() call runs in the iframe's own
// window context, which triggers the OS print dialog without ever opening
// a new window/tab at all.
export function AutoPrintNewOrders({ pendingOrderIds }: { pendingOrderIds: string[] }) {
  const [printQueue, setPrintQueue] = useState<string[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(SEEN_KEY)

    if (raw === null) {
      // First load this admin session — treat whatever's already pending
      // as known, so opening /admin doesn't suddenly print a stack of
      // old orders. Only orders that show up after this point auto-print.
      sessionStorage.setItem(SEEN_KEY, JSON.stringify(pendingOrderIds))
      return
    }

    let seen: Set<string>
    try {
      seen = new Set(JSON.parse(raw) as string[])
    } catch {
      seen = new Set()
    }

    const newOnes = pendingOrderIds.filter((id) => !seen.has(id))
    if (newOnes.length === 0) return

    newOnes.forEach((id) => seen.add(id))
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)))
    setPrintQueue((queue) => [...queue, ...newOnes])
  }, [pendingOrderIds])

  useEffect(() => {
    if (printQueue.length === 0 || !iframeRef.current) return
    const [next, ...rest] = printQueue
    iframeRef.current.src = `/admin/print/${next}`
    // Give the slip's own onload -> window.print() effect time to fire
    // before moving to the next queued order.
    const timer = setTimeout(() => setPrintQueue(rest), 2500)
    return () => clearTimeout(timer)
  }, [printQueue])

  // Zero-size and off-screen rather than display:none — some browsers skip
  // layout (and printing) entirely for display:none content.
  return (
    <iframe
      ref={iframeRef}
      title="Auto-print kitchen slip"
      style={{ position: 'fixed', left: '-9999px', top: 0, width: 1, height: 1, border: 0 }}
    />
  )
}
