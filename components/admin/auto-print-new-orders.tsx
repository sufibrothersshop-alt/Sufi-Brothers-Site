'use client'

import { useEffect, useRef, useState } from 'react'

// Two independent trackers: the bell rings the moment an order arrives
// (regardless of delivery fee), but the kitchen slip only prints once a
// delivery fee has actually been set for that order.
const SEEN_BELL_KEY = 'sufi-admin-notified-orders'
const SEEN_PRINT_KEY = 'sufi-admin-printed-orders'

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx()
  if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume().catch(() => {})
  return sharedAudioCtx
}

// A synthesized two-tone bell — no audio file needed. ~2.3s of ringing.
function ringBell() {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const dings = [880, 660, 880, 660]
  dings.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)
    const start = now + i * 0.5
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.85)
    osc.start(start)
    osc.stop(start + 0.9)
  })
}

function readSeen(key: string): Set<string> | null {
  const raw = sessionStorage.getItem(key)
  if (raw === null) return null
  try {
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export type PendingOrder = { id: string; deliveryFee: number }

// Rings a bell the moment a new order lands, and separately auto-prints the
// 80mm kitchen slip once (and only once) that order's delivery fee has been
// set by the admin — no click behind either, since both are driven by the
// page's own background refresh, not a user gesture. window.open() would
// get silently blocked by the popup blocker in that situation, so printing
// goes through a hidden iframe instead: the print-slip page's own
// window.print() call runs in the iframe's own window context, which
// triggers the OS print dialog without ever opening a new window/tab.
export function AutoPrintNewOrders({ pendingOrders }: { pendingOrders: PendingOrder[] }) {
  const [printQueue, setPrintQueue] = useState<string[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Browsers only allow audio once a user has interacted with the page —
  // unlock (or create) the shared AudioContext on the first click anywhere
  // in the admin panel so a later automatic ringBell() call isn't silently
  // blocked.
  useEffect(() => {
    const unlock = () => getAudioContext()
    document.addEventListener('click', unlock, { once: true })
    return () => document.removeEventListener('click', unlock)
  }, [])

  // Bell: fires for every pending order the instant it's first seen.
  useEffect(() => {
    const allIds = pendingOrders.map((o) => o.id)
    const seen = readSeen(SEEN_BELL_KEY)

    if (seen === null) {
      sessionStorage.setItem(SEEN_BELL_KEY, JSON.stringify(allIds))
      return
    }

    const newOnes = allIds.filter((id) => !seen.has(id))
    if (newOnes.length === 0) return

    newOnes.forEach((id) => seen.add(id))
    sessionStorage.setItem(SEEN_BELL_KEY, JSON.stringify(Array.from(seen)))
    ringBell()
  }, [pendingOrders])

  // Print: only fires once an order's delivery fee is > 0.
  useEffect(() => {
    const printableIds = pendingOrders.filter((o) => o.deliveryFee > 0).map((o) => o.id)
    const seen = readSeen(SEEN_PRINT_KEY)

    if (seen === null) {
      // First load this admin session — treat whatever's already
      // printable as known, so opening /admin doesn't suddenly print a
      // stack of old orders. Only orders that become printable after this
      // point auto-print.
      sessionStorage.setItem(SEEN_PRINT_KEY, JSON.stringify(printableIds))
      return
    }

    const newOnes = printableIds.filter((id) => !seen.has(id))
    if (newOnes.length === 0) return

    newOnes.forEach((id) => seen.add(id))
    sessionStorage.setItem(SEEN_PRINT_KEY, JSON.stringify(Array.from(seen)))
    setPrintQueue((queue) => [...queue, ...newOnes])
  }, [pendingOrders])

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
