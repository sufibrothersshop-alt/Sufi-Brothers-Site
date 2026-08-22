-- Sufi Brothers — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.

create extension if not exists pgcrypto;

-- cleanup: an earlier version of this script created an "admins" table for
-- Supabase-Auth-based admin login. Admin auth is now a single env-var
-- username/password instead (see bottom of this file), so drop it.
drop table if exists public.admins;

-- =========================================================
-- customers — identified by phone number only, no auth/login
-- =========================================================
create table if not exists public.customers (
  phone       text primary key check (char_length(trim(phone)) >= 7),
  name        text,
  is_banned   boolean not null default false,
  ban_reason  text,
  banned_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =========================================================
-- orders
-- =========================================================
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  customer_phone   text not null references public.customers(phone),
  status           text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_address text,
  latitude         double precision,
  longitude        double precision,
  notes            text,
  delivery_fee     numeric(10, 2) not null default 0,
  total_amount     numeric(10, 2) not null check (total_amount >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- additive migration in case orders already existed before latitude/longitude were added
alter table public.orders add column if not exists latitude double precision;
alter table public.orders add column if not exists longitude double precision;
alter table public.orders add column if not exists delivery_fee numeric(10, 2) not null default 0;

create index if not exists idx_orders_customer_phone on public.orders (customer_phone);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- =========================================================
-- order_items — price/name snapshot at order time (menu can change later)
-- =========================================================
create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  item_name      text not null,
  item_category  text,
  unit_price     numeric(10, 2) not null check (unit_price >= 0),
  quantity       integer not null check (quantity > 0),
  line_total     numeric(10, 2) generated always as (unit_price * quantity) stored
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);

-- =========================================================
-- menu_availability — per-item "in stock" toggle and price override, set
-- from the admin panel. item_id matches the MenuItem.id in lib/menu-data.ts
-- (menu content itself stays in code; only availability and price need to
-- change without a deploy). Missing row or null price_override == use the
-- code-defined defaults.
-- =========================================================
-- price_override > 0 is enforced in app/admin/actions.ts (updateItemPrice) rather
-- than a table CHECK constraint, since Postgres has no ADD CONSTRAINT IF NOT
-- EXISTS and this script needs to stay safely re-runnable either way.
create table if not exists public.menu_availability (
  item_id        integer primary key,
  is_available   boolean not null default true,
  price_override numeric(10, 2),
  updated_at     timestamptz not null default now()
);

alter table public.menu_availability add column if not exists price_override numeric(10, 2);

insert into public.menu_availability (item_id)
select unnest(array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61])
on conflict (item_id) do nothing;

-- Note: there is no "admins" table — the admin panel uses a single
-- username/password pair from environment variables (ADMIN_USERNAME,
-- ADMIN_PASSWORD, ADMIN_SESSION_SECRET), checked entirely outside the
-- database. See app/admin/login and lib/admin-auth.ts.

-- =========================================================
-- keep updated_at current
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_menu_availability_updated_at on public.menu_availability;
create trigger trg_menu_availability_updated_at
  before update on public.menu_availability
  for each row execute function public.set_updated_at();

-- =========================================================
-- Row Level Security — locked down by default.
-- No policies are granted to anon/authenticated: the public site can only
-- write through the place_order() function below (SECURITY DEFINER), and
-- the admin panel reads/writes using the service_role key (which bypasses
-- RLS entirely). This keeps customer data and the ban list unreadable from
-- the browser under all circumstances.
--
-- menu_availability is the one exception: it's non-sensitive (just item_id
-- + in-stock flag) and the public site needs to read it directly to grey
-- out sold-out items, so it gets a public SELECT policy.
-- =========================================================
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.menu_availability enable row level security;

drop policy if exists "menu availability is publicly readable" on public.menu_availability;
create policy "menu availability is publicly readable"
  on public.menu_availability
  for select
  to anon, authenticated
  using (true);

-- =========================================================
-- place_order — the only way the public site can write an order.
-- Creates/updates the customer by phone, blocks banned numbers, and
-- inserts the order + line items atomically.
--
-- p_items shape: [{"id": 7, "name": "Zinger Burger", "category": "Burgers", "unit_price": 400, "quantity": 2}, ...]
-- "id" matches MenuItem.id from lib/menu-data.ts and is checked against
-- menu_availability — a sold-out item can't be ordered even if the
-- customer's page was open before it was toggled off, and a price_override
-- there always overrides the client-sent unit_price.
-- p_latitude/p_longitude are optional (from the browser's geolocation, if the
-- customer grants permission) — delivery_address is always the primary
-- human-entered location.
-- =========================================================
drop function if exists public.place_order(text, text, text, text, jsonb);
drop function if exists public.place_order(text, text, text, text, jsonb, double precision, double precision);

create or replace function public.place_order(
  p_phone     text,
  p_name      text,
  p_address   text,
  p_notes     text,
  p_items     jsonb,
  p_latitude  double precision default null,
  p_longitude double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_banned      boolean;
  v_order_id       uuid;
  v_subtotal       numeric(10, 2);
  v_delivery_fee   numeric(10, 2);
  v_total          numeric(10, 2);
  v_sold_out_names text;
begin
  if p_phone is null or char_length(trim(p_phone)) < 7 then
    raise exception 'A valid phone number is required.';
  end if;

  if p_address is null or char_length(trim(p_address)) < 3 then
    raise exception 'A delivery address is required.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item.';
  end if;

  select string_agg(item->>'name', ', ')
  into v_sold_out_names
  from jsonb_array_elements(p_items) as item
  join public.menu_availability ma on ma.item_id = (item->>'id')::integer
  where ma.is_available = false;

  if v_sold_out_names is not null then
    raise exception 'Sorry, these items just sold out: %', v_sold_out_names;
  end if;

  insert into public.customers (phone, name)
  values (trim(p_phone), nullif(trim(p_name), ''))
  on conflict (phone) do update
    set name = coalesce(nullif(trim(excluded.name), ''), public.customers.name)
  returning is_banned into v_is_banned;

  if v_is_banned then
    raise exception 'This phone number is banned from placing orders.';
  end if;

  -- price_override always wins over whatever price the client sent, so a
  -- stale page can't under-charge (or over-charge) against the admin's
  -- current rate.
  select sum(coalesce(ma.price_override, (item->>'unit_price')::numeric) * (item->>'quantity')::integer)
  into v_subtotal
  from jsonb_array_elements(p_items) as item
  left join public.menu_availability ma on ma.item_id = (item->>'id')::integer;

  -- Rs. 100 delivery, free above Rs. 1000 subtotal — decided here, not
  -- trusted from the client, so a stale page can't claim free delivery it
  -- didn't qualify for.
  v_delivery_fee := case when v_subtotal >= 1000 then 0 else 100 end;
  v_total := v_subtotal + v_delivery_fee;

  insert into public.orders (customer_phone, delivery_address, latitude, longitude, notes, delivery_fee, total_amount)
  values (trim(p_phone), trim(p_address), p_latitude, p_longitude, nullif(trim(p_notes), ''), v_delivery_fee, v_total)
  returning id into v_order_id;

  insert into public.order_items (order_id, item_name, item_category, unit_price, quantity)
  select
    v_order_id,
    item->>'name',
    item->>'category',
    coalesce(ma.price_override, (item->>'unit_price')::numeric),
    (item->>'quantity')::integer
  from jsonb_array_elements(p_items) as item
  left join public.menu_availability ma on ma.item_id = (item->>'id')::integer;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(text, text, text, text, jsonb, double precision, double precision) to anon, authenticated;

-- =========================================================
-- Admin login setup: nothing to run here. Set ADMIN_USERNAME, ADMIN_PASSWORD,
-- and ADMIN_SESSION_SECRET in .env.local — see .env.example.
-- =========================================================
