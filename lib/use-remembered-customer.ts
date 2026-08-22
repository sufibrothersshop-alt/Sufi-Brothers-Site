'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sufi-customer-info'

export type CustomerInfo = { name: string; phone: string; address: string }

const EMPTY: CustomerInfo = { name: '', phone: '', address: '' }

function readStored(): CustomerInfo {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw)
    return { name: parsed.name ?? '', phone: parsed.phone ?? '', address: parsed.address ?? '' }
  } catch {
    return EMPTY
  }
}

// Remembers name/phone/address locally so a returning customer doesn't have
// to retype them on every order — the site has no login, so the phone
// number itself is what "remembers" you across visits.
export function useRememberedCustomer() {
  const [info, setInfo] = useState<CustomerInfo>(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info))
    } catch {
      // ignore
    }
  }, [info])

  return [info, setInfo] as const
}
