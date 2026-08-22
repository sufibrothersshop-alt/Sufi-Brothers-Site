import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const ADMIN_COOKIE_NAME = 'admin_session'
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function timingSafeEqualStrings(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // pad to equal length first so timingSafeEqual never throws on a length mismatch
  const paddedA = Buffer.concat([bufA, Buffer.alloc(Math.max(0, bufB.length - bufA.length))])
  const paddedB = Buffer.concat([bufB, Buffer.alloc(Math.max(0, bufA.length - bufB.length))])
  return bufA.length === bufB.length && crypto.timingSafeEqual(paddedA, paddedB)
}

export function verifyCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedUsername || !expectedPassword) return false
  return timingSafeEqualStrings(username, expectedUsername) && timingSafeEqualStrings(password, expectedPassword)
}

export function createSessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set')
  return crypto.createHmac('sha256', secret).update('admin-session').digest('hex')
}

export function isValidSessionToken(token: string | undefined) {
  if (!token) return false
  return timingSafeEqualStrings(token, createSessionToken())
}

export async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!isValidSessionToken(token)) redirect('/admin/login')
}
