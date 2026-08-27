import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// Public browser client — anon key only, used for the place_order RPC and
// reading menu_items. No user auth/session involved. Memoized so we don't
// spin up a fresh client (and its GoTrueClient) on every call.
let client: SupabaseClient | undefined

export function createClient() {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
