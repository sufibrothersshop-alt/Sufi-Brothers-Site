import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client — bypasses Row Level Security entirely.
// NEVER import this from a Client Component. Admin panel data access only.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
