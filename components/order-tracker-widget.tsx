'use client'

import { useState } from 'react'
import { Bike, CheckCircle2, Clock3, Flame, X } from 'lucide-react'
import { OrderTrackerRing } from '@/components/order-tracker-ring'
import { ORDER_PHASES, type ActiveOrder } from '@/lib/use-order-tracker'

const PHASE_ICONS = [Clock3, Flame, Bike]

type OrderTrackerWidgetProps = {
  order: ActiveOrder
  progress: number
  remainingMinutes: number
  currentPhaseIndex: number
  isDelivered: boolean
  onDismiss: () => void
}

export function OrderTrackerWidget({ order, progress, remainingMinutes, currentPhaseIndex, isDelivered, onDismiss }: OrderTrackerWidgetProps) {
  const [expanded, setExpanded] = useState(false)
  const PhaseIcon = isDelivered ? CheckCircle2 : PHASE_ICONS[currentPhaseIndex]
  const phaseLabel = isDelivered ? 'Delivered' : ORDER_PHASES[currentPhaseIndex].label

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {expanded && (
        <div className="w-72 rounded-3xl border border-border bg-card p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
              <p className="mt-0.5 font-serif text-lg font-black">{phaseLabel}</p>
            </div>
            <button onClick={onDismiss} aria-label="Dismiss order tracker" className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="relative flex size-[72px] shrink-0 items-center justify-center">
              <OrderTrackerRing progress={progress} size={72} strokeWidth={7} />
              <PhaseIcon className="absolute size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isDelivered ? 'Enjoy your meal!' : `~${remainingMinutes} min left`}</p>
              <p className="mt-1 text-sm font-bold text-primary">Rs. {order.total}</p>
            </div>
          </div>

          <ol className="mt-4 flex flex-col gap-2">
            {ORDER_PHASES.map((phase, i) => {
              const done = isDelivered || i < currentPhaseIndex
              const active = !isDelivered && i === currentPhaseIndex
              return (
                <li key={phase.key} className="flex items-center gap-2 text-xs">
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      done ? 'bg-primary text-primary-foreground' : active ? 'bg-secondary text-secondary-foreground' : 'bg-secondary/30 text-muted-foreground'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className={active ? 'font-bold' : 'text-muted-foreground'}>{phase.label}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Collapse order tracker' : `Order tracker: ${phaseLabel}, ${remainingMinutes} minutes left`}
        className="relative flex size-16 items-center justify-center rounded-full bg-card shadow-2xl ring-1 ring-border transition hover:-translate-y-0.5"
      >
        <OrderTrackerRing progress={progress} size={64} strokeWidth={6} />
        <PhaseIcon className="absolute size-5 text-primary" />
      </button>
    </div>
  )
}
