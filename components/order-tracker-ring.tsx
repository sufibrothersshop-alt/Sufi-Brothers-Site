import { TOTAL_ORDER_MINUTES, ORDER_PHASES } from '@/lib/use-order-tracker'

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Point on the ring at a given fraction (0-1) around the circle, starting at
// 12 o'clock and sweeping clockwise — matches the progress arc's rotation.
function pointOnRing(fraction: number) {
  const theta = fraction * 2 * Math.PI
  return { x: 50 + RADIUS * Math.sin(theta), y: 50 - RADIUS * Math.cos(theta) }
}

const phaseBoundaries = (() => {
  const boundaries: number[] = []
  let acc = 0
  for (const phase of ORDER_PHASES.slice(0, -1)) {
    acc += phase.minutes
    boundaries.push(acc / TOTAL_ORDER_MINUTES)
  }
  return boundaries
})()

export function OrderTrackerRing({ progress, size = 88, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) {
  const clamped = Math.min(1, Math.max(0, progress))
  const dashOffset = CIRCUMFERENCE * (1 - clamped)

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth={strokeWidth} className="stroke-border" />
      <circle
        cx="50"
        cy="50"
        r={RADIUS}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 50 50)"
        className="stroke-secondary"
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
      {phaseBoundaries.map((fraction) => {
        const { x, y } = pointOnRing(fraction)
        return <circle key={fraction} cx={x} cy={y} r={2.5} strokeWidth={1.5} className="fill-card stroke-border" />
      })}
    </svg>
  )
}
