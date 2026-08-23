'use client'

import { useEffect, useState } from 'react'
import { menuItems } from '@/lib/menu-data'

const SPLASH_SESSION_KEY = 'sufi-splash-shown'
const MIN_DISPLAY_MS = 600 // brief brand moment even on an instant/cached load
const FADE_MS = 300
const MAX_WAIT_MS = 8000 // don't block the site forever if a resource stalls

function preloadImages(onProgress: (loaded: number, total: number) => void) {
  const paths = Array.from(new Set(menuItems.map((item) => item.image).filter((src): src is string => !!src)))
  if (paths.length === 0) return Promise.resolve()

  let loaded = 0
  onProgress(0, paths.length)

  return Promise.all(
    paths.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new window.Image()
          const done = () => {
            loaded += 1
            onProgress(loaded, paths.length)
            resolve()
          }
          img.onload = done
          img.onerror = done
          img.src = src
        })
    )
  )
}

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY)) {
      setVisible(false)
      return
    }
    sessionStorage.setItem(SPLASH_SESSION_KEY, '1')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false)
      return
    }

    const start = Date.now()
    let fadeTimer: ReturnType<typeof setTimeout>
    let hideTimer: ReturnType<typeof setTimeout>
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true
      const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - start))
      fadeTimer = setTimeout(() => setFading(true), remaining)
      hideTimer = setTimeout(() => setVisible(false), remaining + FADE_MS)
    }

    // Waits for both the page's own load event AND every menu photo to be
    // fully fetched — not just what's in the default category's DOM — so
    // switching tabs right after the splash never shows a loading pop-in.
    const pageLoaded = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve()
      else window.addEventListener('load', () => resolve(), { once: true })
    })

    Promise.all([pageLoaded, preloadImages((loaded, total) => setProgress({ loaded, total }))]).then(finish)

    const maxTimer = setTimeout(finish, MAX_WAIT_MS)

    return () => {
      clearTimeout(maxTimer)
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-primary transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <svg
        width="72"
        height="72"
        viewBox="0 0 100 100"
        className={`transition-all duration-500 ${fading ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <path d="M 30 40 L 30 34 A 20 16 0 0 1 70 34 L 70 40 Z" fill="#ffd343" />
        <circle cx="42" cy="30" r="2.4" fill="#b00b1a" />
        <circle cx="50" cy="27" r="2.4" fill="#b00b1a" />
        <circle cx="58" cy="30" r="2.4" fill="#b00b1a" />
        <rect x="16" y="47" width="68" height="10" rx="5" fill="#ffd343" />
        <rect x="24" y="63" width="52" height="12" rx="6" fill="#ffd343" />
      </svg>
      <div className="text-center">
        <p className="font-serif text-2xl font-black text-primary-foreground">Sufi Brothers</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground/70">Fast food &amp; more</p>
      </div>
      {progress.total > 0 && (
        <div className="mt-2 w-40">
          <div className="h-1 overflow-hidden rounded-full bg-primary-foreground/20">
            <div
              className="h-full rounded-full bg-secondary transition-all duration-200"
              style={{ width: `${Math.round((progress.loaded / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
