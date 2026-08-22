# Sufi Brothers

Menu ordering website for Sufi Brothers, a fast food restaurant in Ghouri
Town, Islamabad — burgers, shawarmas, roll parathas, chaat, and shakes.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4** for styling
- **Supabase** (Postgres) for orders, customers, and menu availability/pricing
- **Base UI** (`@base-ui/react`) for the item and cart dialogs

## Features

**Customer-facing site**
- Full menu (58 items) grouped by category, with real photos, prices, and
  Urdu names
- Item detail dialog with quantity picker, "Add to order"
- Cart with checkout: name, phone (required), delivery address (required),
  optional "share my location" (browser geolocation), notes
- Orders are placed via a `place_order` Postgres function — no login
  required, customers are identified by phone number only
- Sold-out items are greyed out and can't be ordered
- PWA install support (manifest, iOS splash screens, home screen icon)

**Admin panel** (`/admin`)
- Simple username/password login (env vars, not Supabase Auth)
- Dashboard: order volume, revenue, pending orders, banned customers at a
  glance
- Recent orders with status updates (pending → confirmed → preparing → out
  for delivery → delivered / cancelled)
- Customer search by phone number, with a per-customer profile page (order
  history, cancelled count, total paid, most recent delivery location)
- Ban/unban a phone number — banned numbers are rejected server-side, not
  just hidden in the UI
- Menu management by category: toggle an item sold out/available, or
  override its price, both live without a code deploy
- Dashboard auto-refreshes every 15 seconds (no manual reload needed)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in the values below
pnpm dev
```

### Environment variables (`.env.local`)

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (**server-only, never commit**) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Pick your own admin login |
| `ADMIN_SESSION_SECRET` | Any random string — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Database setup

Run `supabase/schema.sql` in your Supabase project's SQL Editor. It's
idempotent — safe to re-run any time the schema changes (tables, RLS
policies, and the `place_order` function are all defined with
`if not exists` / `or replace`).

The menu itself (names, prices, images, categories) lives in
`lib/menu-data.ts`, not the database — only per-item availability and price
overrides are stored in Supabase, editable from `/admin` without a deploy.

## Project structure

```
app/
  page.tsx              Public menu site
  admin/                Admin panel (dashboard, login, customer profiles)
  manifest.ts           PWA manifest
components/
  dish-dialog.tsx        Item detail modal
  cart-dialog.tsx         Cart + checkout
  admin/                 Admin dashboard pieces (order cards, stat tiles, menu management)
lib/
  menu-data.ts            The menu: items, categories, prices
  admin-auth.ts           Admin login/session logic
  supabase/               Supabase clients (browser + service-role)
supabase/
  schema.sql              Full database schema (tables, RLS, functions)
docs/
  soofi_brothers_menu_prices.csv   Source price list
```
