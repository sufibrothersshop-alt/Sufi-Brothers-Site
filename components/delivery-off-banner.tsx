import { AlertTriangle } from 'lucide-react'

export function DeliveryOffBanner() {
  return (
    <div className="fixed inset-x-0 top-1/2 z-50 -translate-y-1/2">
      <div className="mx-auto flex max-w-xl items-center justify-center gap-3 bg-destructive px-6 py-4 text-center text-white shadow-2xl sm:rounded-2xl">
        <AlertTriangle className="size-5 shrink-0" />
        <p className="text-sm font-bold sm:text-base">Sorry for the inconvenience! Delivery is off right now.</p>
      </div>
    </div>
  )
}
