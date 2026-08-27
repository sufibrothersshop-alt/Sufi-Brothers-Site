'use client'

import { useEffect } from 'react'

// Quietly warms the browser's cache for every menu photo, one at a time,
// well after the page is already visible — so switching categories feels
// instant without making anyone wait through a slow splash screen first.
export function MenuImagePrefetcher({ images }: { images: (string | null)[] }) {
  useEffect(() => {
    if (images.length === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const paths = Array.from(new Set(images.filter((src): src is string => !!src)))
    let cancelled = false
    let index = 0

    const loadNext = () => {
      if (cancelled || index >= paths.length) return
      const img = new window.Image()
      img.onload = img.onerror = () => {
        index += 1
        schedule()
      }
      img.src = paths[index]
    }

    const schedule = () => {
      if ('requestIdleCallback' in window) {
        ;(window as Window & typeof globalThis).requestIdleCallback(loadNext, { timeout: 2000 })
      } else {
        setTimeout(loadNext, 200)
      }
    }

    const startTimer = setTimeout(schedule, 1500) // let the initial page settle first

    return () => {
      cancelled = true
      clearTimeout(startTimer)
    }
  }, [images.length])

  return null
}
