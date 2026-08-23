'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME, createSessionToken, requireAdmin, verifyCredentials } from '@/lib/admin-auth'

export async function signIn(formData: FormData) {
  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!verifyCredentials(username, password)) {
    redirect('/admin/login?error=invalid_credentials')
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  })

  redirect('/admin')
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
  redirect('/admin/login')
}

export async function banCustomer(phone: string, formData: FormData) {
  await requireAdmin()
  const reason = String(formData.get('reason') ?? '').trim()
  const admin = createAdminClient()
  await admin
    .from('customers')
    .update({ is_banned: true, ban_reason: reason || null, banned_at: new Date().toISOString() })
    .eq('phone', phone)
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`)
}

export async function unbanCustomer(phone: string) {
  await requireAdmin()
  const admin = createAdminClient()
  await admin
    .from('customers')
    .update({ is_banned: false, ban_reason: null, banned_at: null })
    .eq('phone', phone)
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`)
}

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'] as const

export async function updateOrderStatus(orderId: string, formData: FormData) {
  await requireAdmin()
  const status = String(formData.get('status') ?? '')
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) return
  const admin = createAdminClient()
  await admin.from('orders').update({ status }).eq('id', orderId)
  revalidatePath('/admin')
  revalidatePath('/admin/customers/[phone]', 'page')
}

export async function assignRider(orderId: string, formData: FormData) {
  await requireAdmin()
  const riderId = String(formData.get('rider_id') ?? '').trim()
  const admin = createAdminClient()
  await admin.from('orders').update({ rider_id: riderId || null }).eq('id', orderId)
  revalidatePath('/admin')
  revalidatePath('/admin/customers/[phone]', 'page')
}

export async function setItemAvailability(itemId: number, isAvailable: boolean) {
  await requireAdmin()
  const admin = createAdminClient()
  await admin.from('menu_availability').upsert({ item_id: itemId, is_available: isAvailable })
  revalidatePath('/admin/menu')
}

export async function updateItemPrice(itemId: number, formData: FormData) {
  await requireAdmin()
  const price = Number(formData.get('price'))
  if (!Number.isFinite(price) || price <= 0) return
  const admin = createAdminClient()
  await admin.from('menu_availability').upsert({ item_id: itemId, price_override: price })
  revalidatePath('/admin/menu')
}

export async function resetItemPrice(itemId: number) {
  await requireAdmin()
  const admin = createAdminClient()
  await admin.from('menu_availability').update({ price_override: null }).eq('item_id', itemId)
  revalidatePath('/admin/menu')
}

export async function addRider(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (!name || !phone) return
  const admin = createAdminClient()
  await admin.from('riders').insert({ name, phone })
  revalidatePath('/admin/riders')
  revalidatePath('/admin')
}

export async function setRiderActive(riderId: string, isActive: boolean) {
  await requireAdmin()
  const admin = createAdminClient()
  await admin.from('riders').update({ is_active: isActive }).eq('id', riderId)
  revalidatePath('/admin/riders')
  revalidatePath('/admin')
}

export async function setDeliveryEnabled(enabled: boolean) {
  await requireAdmin()
  const admin = createAdminClient()
  await admin.from('site_settings').update({ delivery_enabled: enabled }).eq('id', 1)
  revalidatePath('/admin')
}
