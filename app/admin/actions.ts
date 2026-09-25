'use server'

import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME, createSessionCookieValue, requireAdmin, verifyCredentials } from '@/lib/admin-auth'

export async function signIn(formData: FormData) {
  const username = String(formData.get('username') ?? '')
  const password = String(formData.get('password') ?? '')

  // Which branch you land in is decided entirely by which branch's
  // username/password matched — there's no separate branch selector here.
  const branch = verifyCredentials(username, password)
  if (!branch) {
    redirect('/admin/login?error=invalid_credentials')
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, createSessionCookieValue(branch), {
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
  const branch = await requireAdmin()
  const reason = String(formData.get('reason') ?? '').trim()
  const admin = createAdminClient()
  await admin
    .from('customers')
    .update({ is_banned: true, ban_reason: reason || null, banned_at: new Date().toISOString() })
    .eq('phone', phone)
    .eq('branch', branch)
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`)
}

export async function unbanCustomer(phone: string) {
  const branch = await requireAdmin()
  const admin = createAdminClient()
  await admin
    .from('customers')
    .update({ is_banned: false, ban_reason: null, banned_at: null })
    .eq('phone', phone)
    .eq('branch', branch)
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${encodeURIComponent(phone)}`)
}

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'] as const
const STATUSES_REQUIRING_FEE = new Set(['confirmed', 'preparing', 'out_for_delivery', 'delivered'])

export async function updateOrderStatus(orderId: string, formData: FormData) {
  const branch = await requireAdmin()
  const status = String(formData.get('status') ?? '')
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) return
  const admin = createAdminClient()
  if (STATUSES_REQUIRING_FEE.has(status)) {
    const { data: order } = await admin.from('orders').select('delivery_fee').eq('id', orderId).eq('branch', branch).single()
    if (!order || Number(order.delivery_fee) <= 0) return
  }
  await admin.from('orders').update({ status }).eq('id', orderId).eq('branch', branch)
  revalidatePath('/admin')
  revalidatePath('/admin/customers/[phone]', 'page')
}

export async function updateDeliveryFee(orderId: string, formData: FormData) {
  const branch = await requireAdmin()
  const fee = Number(formData.get('delivery_fee'))
  if (!Number.isFinite(fee) || fee < 0) return
  const admin = createAdminClient()
  const { data: items } = await admin.from('order_items').select('line_total').eq('order_id', orderId)
  const subtotal = (items ?? []).reduce((sum, item) => sum + Number(item.line_total), 0)
  await admin.from('orders').update({ delivery_fee: fee, total_amount: subtotal + fee }).eq('id', orderId).eq('branch', branch)
  revalidatePath('/admin')
  revalidatePath('/admin/customers/[phone]', 'page')
}

export async function assignRider(orderId: string, formData: FormData) {
  const branch = await requireAdmin()
  const riderId = String(formData.get('rider_id') ?? '').trim()
  const admin = createAdminClient()
  // Confirms the rider is actually this branch's before assigning — the
  // dropdown only ever lists this branch's riders, but this stops a forged
  // rider_id from attaching another branch's rider to this branch's order.
  if (riderId) {
    const { data: rider } = await admin.from('riders').select('id').eq('id', riderId).eq('branch', branch).maybeSingle()
    if (!rider) return
  }
  await admin.from('orders').update({ rider_id: riderId || null }).eq('id', orderId).eq('branch', branch)
  revalidatePath('/admin')
  revalidatePath('/admin/customers/[phone]', 'page')
}

export async function setItemAvailability(itemId: number, isAvailable: boolean) {
  const branch = await requireAdmin()
  const admin = createAdminClient()
  await admin.from('menu_items').update({ is_available: isAvailable }).eq('id', itemId).eq('branch', branch)
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`) // that branch's public menu is cached (ISR) — refresh it too
}

export async function updateItemPrice(itemId: number, formData: FormData) {
  const branch = await requireAdmin()
  const price = Number(formData.get('price'))
  if (!Number.isFinite(price) || price <= 0) return
  const admin = createAdminClient()
  await admin.from('menu_items').update({ price }).eq('id', itemId).eq('branch', branch)
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`)
}

export async function addMenuItem(formData: FormData) {
  const branch = await requireAdmin()
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

  await admin.from('menu_items').insert({ category, name, subtitle, price, image, branch })
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`)
}

export async function deleteMenuItem(itemId: number) {
  const branch = await requireAdmin()
  const admin = createAdminClient()
  await admin.from('menu_items').delete().eq('id', itemId).eq('branch', branch)
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`)
}

// An admin's own emoji for a category (e.g. one they typed into "Add item"
// that isn't in the built-in map) — see the category_icons table and
// lib/menu-data.ts's getCategoryEmoji. Branch-scoped: category is whatever
// text is on that branch's menu_items.category, not a separate id, so no
// extra ownership check is needed beyond keying every write to this admin's
// own branch. Blank emoji removes the override (reverts to the default icon).
export async function setCategoryIcon(category: string, formData: FormData) {
  const branch = await requireAdmin()
  const emoji = String(formData.get('emoji') ?? '').trim()
  const admin = createAdminClient()
  if (!emoji) {
    await admin.from('category_icons').delete().eq('branch', branch).eq('category', category)
  } else {
    await admin.from('category_icons').upsert({ branch, category, emoji }, { onConflict: 'branch,category' })
  }
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`)
}

export async function addRider(formData: FormData) {
  const branch = await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (!name || !phone) return
  const admin = createAdminClient()
  await admin.from('riders').insert({ name, phone, branch })
  revalidatePath('/admin/riders')
  revalidatePath('/admin')
}

export async function setRiderActive(riderId: string, isActive: boolean) {
  const branch = await requireAdmin()
  const admin = createAdminClient()
  await admin.from('riders').update({ is_active: isActive }).eq('id', riderId).eq('branch', branch)
  revalidatePath('/admin/riders')
  revalidatePath('/admin')
}

export async function setDeliveryEnabled(enabled: boolean) {
  const branch = await requireAdmin()
  const admin = createAdminClient()
  await admin.from('site_settings').update({ delivery_enabled: enabled }).eq('branch', branch)
  revalidatePath('/admin')
}

const STALE_PENDING_HOURS = 24

// Clears the pending-orders backlog by cancelling (not deleting) anything
// that's been sitting in 'pending' for a day or more — a real order placed
// minutes ago is never touched even if this is clicked mid-shift. Records
// stay in the database (still shows in Total orders, findable via customer
// history) but drop out of the pending count and out of the revenue total.
export async function cancelStalePendingOrders() {
  const branch = await requireAdmin()
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - STALE_PENDING_HOURS * 60 * 60 * 1000).toISOString()
  await admin.from('orders').update({ status: 'cancelled' }).eq('status', 'pending').eq('branch', branch).lt('created_at', cutoff)
  revalidatePath('/admin')
  revalidatePath('/admin/customers/[phone]', 'page')
}

// Variant questions on a menu item — e.g. a pizza's "Size" (required) or
// "Extra toppings" (optional) group, each with its own priced choices. Every
// write below re-verifies ownership down to the branch (item -> group ->
// choice) with plain sequential lookups rather than a nested embed filter,
// so one admin can never attach or delete another branch's options even by
// guessing an id.

export async function addOptionGroup(itemId: number, formData: FormData) {
  const branch = await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const required = formData.get('required') === 'on'
  const admin = createAdminClient()
  const { data: item } = await admin.from('menu_items').select('id').eq('id', itemId).eq('branch', branch).maybeSingle()
  if (!item) return
  await admin.from('menu_item_option_groups').insert({ menu_item_id: itemId, name, required })
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`)
}

export async function deleteOptionGroup(groupId: number) {
  const branch = await requireAdmin()
  const admin = createAdminClient()
  const { data: group } = await admin.from('menu_item_option_groups').select('id, menu_item_id').eq('id', groupId).maybeSingle()
  if (!group) return
  const { data: item } = await admin.from('menu_items').select('id').eq('id', group.menu_item_id).eq('branch', branch).maybeSingle()
  if (!item) return
  await admin.from('menu_item_option_groups').delete().eq('id', groupId)
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`)
}

export async function addOptionChoice(groupId: number, formData: FormData) {
  const branch = await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const priceDelta = Number(formData.get('price_delta') || 0)
  if (!name || !Number.isFinite(priceDelta)) return
  const admin = createAdminClient()
  const { data: group } = await admin.from('menu_item_option_groups').select('id, menu_item_id').eq('id', groupId).maybeSingle()
  if (!group) return
  const { data: item } = await admin.from('menu_items').select('id').eq('id', group.menu_item_id).eq('branch', branch).maybeSingle()
  if (!item) return
  await admin.from('menu_item_option_choices').insert({ option_group_id: groupId, name, price_delta: priceDelta })
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`)
}

export async function deleteOptionChoice(choiceId: number) {
  const branch = await requireAdmin()
  const admin = createAdminClient()
  const { data: choice } = await admin.from('menu_item_option_choices').select('id, option_group_id').eq('id', choiceId).maybeSingle()
  if (!choice) return
  const { data: group } = await admin.from('menu_item_option_groups').select('id, menu_item_id').eq('id', choice.option_group_id).maybeSingle()
  if (!group) return
  const { data: item } = await admin.from('menu_items').select('id').eq('id', group.menu_item_id).eq('branch', branch).maybeSingle()
  if (!item) return
  await admin.from('menu_item_option_choices').delete().eq('id', choiceId)
  revalidatePath('/admin/menu')
  revalidatePath(`/${branch}`)
}
