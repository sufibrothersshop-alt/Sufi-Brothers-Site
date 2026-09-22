import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { BRANCHES, isBranch, type Branch } from '@/lib/branches'

export { branchName, type Branch } from '@/lib/branches'

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

// Ghouri Town keeps the original ADMIN_USERNAME/ADMIN_PASSWORD env vars
// (already set in production); every other branch gets its own
// ADMIN_<BRANCH>_USERNAME / ADMIN_<BRANCH>_PASSWORD pair.
function credentialEnvVars(branch: Branch): { username?: string; password?: string } {
  if (branch === 'ghouri-town') {
    return { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }
  }
  const prefix = `ADMIN_${branch.toUpperCase().replace(/-/g, '_')}`
  return { username: process.env[`${prefix}_USERNAME`], password: process.env[`${prefix}_PASSWORD`] }
}

// Which branch's admin panel you land in is determined entirely by which
// branch's username/password you typed — there's no separate branch picker
// on the admin login form.
export function verifyCredentials(username: string, password: string): Branch | null {
  for (const { slug } of BRANCHES) {
    const { username: expectedUsername, password: expectedPassword } = credentialEnvVars(slug)
    if (!expectedUsername || !expectedPassword) continue
    if (timingSafeEqualStrings(username, expectedUsername) && timingSafeEqualStrings(password, expectedPassword)) {
      return slug
    }
  }
  return null
}

function createSessionToken(branch: Branch) {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set')
  return crypto.createHmac('sha256', secret).update(`admin-session:${branch}`).digest('hex')
}

// Cookie value is "<branch>.<hmac>" — the branch travels with the signed
// session so every admin page/action knows which branch's data to read and
// write without trusting anything the client sends outside this cookie.
export function createSessionCookieValue(branch: Branch) {
  return `${branch}.${createSessionToken(branch)}`
}

function parseSessionCookieValue(raw: string | undefined): Branch | null {
  if (!raw) return null
  const dot = raw.indexOf('.')
  if (dot === -1) return null
  const branch = raw.slice(0, dot)
  const token = raw.slice(dot + 1)
  if (!isBranch(branch)) return null
  return timingSafeEqualStrings(token, createSessionToken(branch)) ? branch : null
}

export async function requireAdmin(): Promise<Branch> {
  const cookieStore = await cookies()
  const branch = parseSessionCookieValue(cookieStore.get(ADMIN_COOKIE_NAME)?.value)
  if (!branch) redirect('/admin/login')
  return branch
}
