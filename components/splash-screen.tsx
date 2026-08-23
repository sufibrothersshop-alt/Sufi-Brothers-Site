'use client'

import { useEffect, useState } from 'react'

const SPLASH_SESSION_KEY = 'sufi-splash-shown'
const MIN_DISPLAY_MS = 600 // brief brand moment even on an instant/cached load
const FADE_MS = 300
const MAX_WAIT_MS = 4000 // don't block the site forever if a resource stalls

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

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

    // Waits for the page's own load event (images, fonts, everything the
    // initial render pulled in) rather than a fixed timer, so the splash
    // never drops away onto a still-loading page. Deliberately does NOT
    // wait for every menu photo across every category — that's prefetched
    // separately in the background after the site is already visible, so
    // the splash itself stays quick.
    const finish = () => {
      if (finished) return
      finished = true
      const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - start))
      fadeTimer = setTimeout(() => setFading(true), remaining)
      hideTimer = setTimeout(() => setVisible(false), remaining + FADE_MS)
    }

    if (document.readyState === 'complete') {
      finish()
    } else {
      window.addEventListener('load', finish)
    }
    const maxTimer = setTimeout(finish, MAX_WAIT_MS)

    return () => {
      window.removeEventListener('load', finish)
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
    </div>
  )
}
