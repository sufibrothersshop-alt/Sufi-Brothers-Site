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
-- riders — delivery staff, managed from the admin panel
-- =========================================================
create table if not exists public.riders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================
-- site_settings — single-row global switches, set from the admin panel.
-- Right now just the delivery on/off toggle.
-- =========================================================
create table if not exists public.site_settings (
  id               integer primary key default 1,
  delivery_enabled boolean not null default true,
  updated_at       timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

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
alter table public.orders add column if not exists rider_id uuid references public.riders(id);

create index if not exists idx_orders_customer_phone on public.orders (customer_phone);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_rider_id on public.orders (rider_id);
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

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- =========================================================
-- Row Level Security — locked down by default.
-- No policies are granted to anon/authenticated: the public site can only
-- write through the place_order() function below (SECURITY DEFINER), and
-- the admin panel reads/writes using the service_role key (which bypasses
-- RLS entirely). This keeps customer data and the ban list unreadable from
-- the browser under all circumstances.
--
-- menu_availability and site_settings are the exceptions: neither is
-- sensitive (an in-stock flag and a single delivery on/off switch), and the
-- public site needs to read both directly, so they get public SELECT
-- policies.
-- =========================================================
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.riders enable row level security;
alter table public.menu_availability enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "menu availability is publicly readable" on public.menu_availability;
create policy "menu availability is publicly readable"
  on public.menu_availability
  for select
  to anon, authenticated
  using (true);

drop policy if exists "site settings are publicly readable" on public.site_settings;
create policy "site settings are publicly readable"
  on public.site_settings
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
  if not coalesce((select delivery_enabled from public.site_settings where id = 1), true) then
    raise exception 'Sorry, we are not taking orders right now. Please try again later.';
  end if;

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

  -- Flat Rs. 100 delivery, no free-above-threshold exception. Decided here,
  -- not trusted from the client, so a stale page can't send a different fee.
  v_delivery_fee := 100;
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
-- get_customer_info — lets the checkout form recognize a returning
-- customer across devices (not just this browser's localStorage): given an
-- EXACT phone number, returns their saved name and most recent delivery
-- address so those fields can be pre-filled.
--
-- This intentionally reveals nothing else (no order history, no ban
-- status, no way to browse/enumerate customers) and only ever returns data
-- for the exact number the caller already has — someone would need to
-- already know/guess a specific customer's phone number to get anything
-- back, the same way any "recognize returning caller" lookup works.
-- Banned numbers get no match, so the checkout form treats them as unknown.
-- =========================================================
create or replace function public.get_customer_info(p_phone text)
returns table (name text, delivery_address text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select c.name, o.delivery_address
  from public.customers c
  left join lateral (
    select o2.delivery_address
    from public.orders o2
    where o2.customer_phone = c.phone and o2.delivery_address is not null
    order by o2.created_at desc
    limit 1
  ) o on true
  where c.phone = trim(p_phone) and c.is_banned = false;
end;
$$;

grant execute on function public.get_customer_info(text) to anon, authenticated;

-- =========================================================
-- get_order_status — lets the customer's own order-tracker widget poll for
-- real progress (status + assigned rider) instead of guessing purely from
-- a timer. Takes the order's own id as the lookup key, which acts like a
-- receipt number: an unguessable UUID the customer already has from
-- place_order's return value, not something that lets you browse other
-- people's orders.
-- =========================================================
create or replace function public.get_order_status(p_order_id uuid)
returns table (status text, rider_name text, rider_phone text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select o.status, r.name, r.phone
  from public.orders o
  left join public.riders r on r.id = o.rider_id
  where o.id = p_order_id;
end;
$$;

grant execute on function public.get_order_status(uuid) to anon, authenticated;

-- =========================================================
-- Admin login setup: nothing to run here. Set ADMIN_USERNAME, ADMIN_PASSWORD,
-- and ADMIN_SESSION_SECRET in .env.local — see .env.example.
-- =========================================================
