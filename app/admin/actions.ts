'use server'

import { randomUUID } from 'crypto'
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
const STATUSES_REQUIRING_FEE = new Set(['confirmed', 'preparing', 'out_for_delivery', 'delivered'])

export async function updateOrderStatus(orderId: string, formData: FormData) {
  await requireAdmin()
  const status = String(formData.get('status') ?? '')
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) return
  const admin = createAdminClient()
  if (STATUSES_REQUIRING_FEE.has(status)) {
    const { data: order } = await admin.from('orders').select('delivery_fee').eq('id', orderId).single()
    if (!order || Number(order.delivery_fee) <= 0) return
  }
  await admin.from('orders').update({ status }).eq('id', orderId)
  revalidatePath('/admin')
  revalidatePath('/admin/customers/[phone]', 'page')
}

export async function updateDeliveryFee(orderId: string, formData: FormData) {
  await requireAdmin()
  const fee = Number(formData.get('delivery_fee'))
  if (!Number.isFinite(fee) || fee < 0) return
  const admin = createAdminClient()
  const { data: items } = await admin.from('order_items').select('line_total').eq('order_id', orderId)
  const subtotal = (items ?? []).reduce((sum, item) => sum + Number(item.line_total), 0)
  await admin.from('orders').update({ delivery_fee: fee, total_amount: subtotal + fee }).eq('id', orderId)
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
  await admin.from('menu_items').update({ is_available: isAvailable }).eq('id', itemId)
  revalidatePath('/admin/menu')
}

export async function updateItemPrice(itemId: number, formData: FormData) {
  await requireAdmin()
  const price = Number(formData.get('price'))
  if (!Number.isFinite(price) || price <= 0) return
  const admin = createAdminClient()
  await admin.from('menu_items').update({ price }).eq('id', itemId)
  revalidatePath('/admin/menu')
}

export async function addMenuItem(formData: FormData) {
  await requireAdmin()
  const category = String(formData.get('category') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const subtitle = String(formData.get('subtitle') ?? '').trim()
  const price = Number(formData.get('price'))
  if (!category || !name || !Number.isFinite(price) || price <= 0) return

  const admin = createAdminClient()

  let image: string | null = null
  const file = formData.get('image')
  if (file instanceof File && file.size > 0) {
    // Phone camera photos land here at several MB each — re-encode to a
    // compressed WebP before storing so the public site never has to serve
    // multi-megabyte images per dish (see the one-time migration that fixed
    // this for the original menu photos).
    const sharp = (await import('sharp')).default
    const original = Buffer.from(await file.arrayBuffer())
    const optimized = await sharp(original).webp({ quality: 82 }).toBuffer()
    const path = `${randomUUID()}.webp`
    const { error: uploadError } = await admin.storage.from('menu-images').upload(path, optimized, {
      contentType: 'image/webp',
    })
    if (!uploadError) {
      image = admin.storage.from('menu-images').getPublicUrl(path).data.publicUrl
    }
  }

  await admin.from('menu_items').insert({ category, name, subtitle, price, image })
  revalidatePath('/admin/menu')
}

export async function deleteMenuItem(itemId: number) {
  await requireAdmin()
  const admin = createAdminClient()
  await admin.from('menu_items').delete().eq('id', itemId)
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
