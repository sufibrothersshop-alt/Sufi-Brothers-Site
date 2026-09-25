-- Sufi Brothers — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.

create extension if not exists pgcrypto;

-- cleanup: an earlier version of this script created an "admins" table for
-- Supabase-Auth-based admin login. Admin auth is now a single env-var
-- username/password instead (see bottom of this file), so drop it.
drop table if exists public.admins;

-- =========================================================
-- branches — each is a fully separate shop: its own menu, orders,
-- customers, riders, delivery toggle, and admin login. Adding a third
-- branch later is just another row here (plus its own admin env vars) —
-- nothing else in this file hardcodes the branch list.
-- =========================================================
create table if not exists public.branches (
  slug text primary key,
  name text not null
);

insert into public.branches (slug, name) values
  ('ghouri-town', 'Ghouri Town'),
  ('khana', 'Khana')
on conflict (slug) do nothing;

-- =========================================================
-- customers — identified by phone number only, no auth/login. A phone
-- number is a separate customer per branch (fully independent order
-- history, ban status, etc.) rather than one shared identity, so the
-- primary key is (phone, branch) instead of just phone.
-- =========================================================
create table if not exists public.customers (
  phone       text check (char_length(trim(phone)) >= 7),
  name        text,
  is_banned   boolean not null default false,
  ban_reason  text,
  banned_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.customers add column if not exists branch text not null default 'ghouri-town' references public.branches(slug);
-- orders' FK depends on this PK, so it has to come off first — safe on a
-- fresh install too (orders may not exist yet), re-added down in the
-- orders section as a composite FK.
-- Drop both the original FK name and the composite one this migration
-- creates further down (line ~118) — re-running this script a second time
-- would otherwise fail here, since by then the FK has already been renamed
-- and still depends on this primary key.
alter table if exists public.orders drop constraint if exists orders_customer_phone_fkey;
alter table if exists public.orders drop constraint if exists orders_customer_phone_branch_fkey;
alter table public.customers drop constraint if exists customers_pkey;
alter table public.customers add primary key (phone, branch);

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

alter table public.riders add column if not exists branch text not null default 'ghouri-town' references public.branches(slug);
create index if not exists idx_riders_branch on public.riders (branch);

-- =========================================================
-- site_settings — per-branch switches set from the admin panel. Right now
-- just the delivery on/off toggle. Used to be a single global row (id=1,
-- checked id=1); migrated below to one row per branch instead.
-- =========================================================
create table if not exists public.site_settings (
  id               integer,
  delivery_enabled boolean not null default true,
  updated_at       timestamptz not null default now()
);

alter table public.site_settings add column if not exists branch text references public.branches(slug);
-- Only meaningful on the very first run (id gets dropped below, right after
-- being used once) — guarded so re-running this script doesn't fail once
-- the column is already gone.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'site_settings' and column_name = 'id') then
    update public.site_settings set branch = 'ghouri-town' where branch is null and id = 1;
  end if;
end $$;
alter table public.site_settings drop constraint if exists site_settings_singleton;
alter table public.site_settings drop constraint if exists site_settings_pkey;
alter table public.site_settings alter column branch set not null;
alter table public.site_settings add primary key (branch);
alter table public.site_settings drop column if exists id;

insert into public.site_settings (branch, delivery_enabled) values ('ghouri-town', true) on conflict (branch) do nothing;
-- New branch starts with delivery OFF until its menu is actually ready to take orders.
insert into public.site_settings (branch, delivery_enabled) values ('khana', false) on conflict (branch) do nothing;

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

-- customers' primary key became (phone, branch) above, so the FK here has to
-- follow — every existing order defaults to 'ghouri-town', the only branch
-- that existed before this migration.
alter table public.orders add column if not exists branch text not null default 'ghouri-town' references public.branches(slug);
alter table public.orders drop constraint if exists orders_customer_phone_fkey;
alter table public.orders add constraint orders_customer_phone_branch_fkey
  foreign key (customer_phone, branch) references public.customers(phone, branch);

create index if not exists idx_orders_customer_phone on public.orders (customer_phone);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_rider_id on public.orders (rider_id);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_branch on public.orders (branch);

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
-- menu_availability — SUPERSEDED by menu_items below. Left in place (with
-- whatever it already holds) purely so nothing breaks if something old
-- still queries it; the app no longer reads or writes this table. New
-- installs don't need it at all.
-- =========================================================
create table if not exists public.menu_availability (
  item_id        integer primary key,
  is_available   boolean not null default true,
  price_override numeric(10, 2),
  updated_at     timestamptz not null default now()
);

alter table public.menu_availability add column if not exists price_override numeric(10, 2);

-- =========================================================
-- menu_items — the menu itself, fully admin-managed from now on (previously
-- a hardcoded array in lib/menu-data.ts + menu_availability for the
-- overrides). Adding/renaming/pricing/removing an item or swapping its
-- photo is now a database write the admin panel can do directly — no code
-- deploy needed. Photos live in Supabase Storage (bucket "menu-images")
-- since Vercel's public/ folder can't be written to at runtime.
-- =========================================================
create table if not exists public.menu_items (
  id           bigserial primary key,
  category     text not null,
  name         text not null,
  subtitle     text not null default '',
  price        numeric(10, 2) not null check (price > 0),
  image        text,
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Each branch has a fully separate menu — everything seeded below is the
-- original (only) menu, so it all defaults to 'ghouri-town'. Khana's menu
-- starts empty; add its items from Khana's own /admin/menu once its admin
-- login is set up.
alter table public.menu_items add column if not exists branch text not null default 'ghouri-town' references public.branches(slug);
create index if not exists idx_menu_items_branch on public.menu_items (branch);

-- One-time seed from the old lib/menu-data.ts array, folding in whatever
-- was already set in menu_availability at migration time. Explicit ids so
-- this stays idempotent (on conflict do nothing) across re-runs; the
-- sequence is bumped past them right after so new admin-added items get
-- fresh ids.
insert into public.menu_items (id, category, name, subtitle, price, image, is_available) values
  (1, 'Deals', 'Deal 01', '01 Zinger Burger + 01 Reg Drink + Fries', 450, '/deals/deal-1.webp', true),
  (2, 'Deals', 'Deal 02', '02 Zinger Burger + 02 Reg Drink + Fries', 890, '/deals/deal-2.webp', true),
  (3, 'Deals', 'Deal 03', '01 Zinger Burger + 01 Chicken Shawarma + 01 Half Ltr Drink + Fries', 640, '/deals/deal-3.webp', true),
  (4, 'Deals', 'Deal 04', '03 Zinger Burger + 01 Ltr Drink + Fries', 1200, '/deals/deal-4.webp', true),
  (5, 'Deals', 'Deal 05', '02 Zinger Roll Paratha + 02 Zinger Shawarma + 01 Ltr Drink', 1150, '/deals/deal-5.webp', true),
  (6, 'Deals', 'Deal 06', '02 Anda Shami Burger + 02 Chicken Shawarma + 01 Ltr Drink', 780, '/deals/deal-6.webp', true),
  (7, 'Burgers', 'Zinger Burger', 'زنگر برگر', 400, '/Burgers/zinger-burger.webp', true),
  (8, 'Burgers', 'Zinger Cheese Burger', 'زنگر چیز برگر', 450, '/Burgers/zinger-burger-cheeze.webp', true),
  (9, 'Burgers', 'Chicken Patty Burger', 'چکن پیٹی برگر', 280, '/Burgers/chicken-pattie-burger.webp', true),
  (10, 'Burgers', 'Chicken Patty Cheese Burger', 'چکن پیٹی چیز برگر', 330, '/Burgers/chicken-pattie-burger-cheeze.webp', true),
  (11, 'Burgers', 'Double Taker Burger', 'ڈبل ٹیکر برگر', 580, '/Burgers/chicken-takar-burger.webp', true),
  (12, 'Burgers', 'Chicken Lapeta Burger', 'چکن لپیٹا برگر', 350, '/Burgers/chicken-lapeta-burger.webp', true),
  (63, 'Burgers', 'Chicken Cheese Lapeta Burger', 'چکن چیز لپیٹا برگر', 400, '/Burgers/chicken-cheeze-lapeta-burger.webp', true),
  (13, 'Burgers', 'Shami Burger', 'شامی برگر', 140, '/Burgers/shami-burger.webp', true),
  (14, 'Burgers', 'Anda Shami Burger', 'انڈہ شامی برگر', 170, '/Burgers/anda-burger.webp', true),
  (15, 'Burgers', 'Double Anda Roll Burger', 'ڈبل انڈہ رول برگر', 230, '/Burgers/double-anda-roll-burger.webp', true),
  (16, 'Burgers', 'Shami Kebab', 'شامی کباب', 40, '/Burgers/shami-kabab.webp', true),
  (64, 'Burgers', 'Mayonnaise Small', 'میئونیز چھوٹا', 30, '/Burgers/mayonese-small.webp', true),
  (65, 'Burgers', 'Mayonnaise Big', 'میئونیز بڑا', 50, '/Burgers/mayonese-big.webp', true),
  (17, 'Fries', 'Loaded Fries', 'لوڈڈ فرائز', 350, '/Fries/loaded-fries.webp', true),
  (18, 'Fries', 'Nuggets', 'نگٹس', 350, '/Fries/nugets.webp', true),
  (29, 'Fries', 'Finger Chips', 'فنگر چپس', 150, '/Fries/fries.webp', true),
  (19, 'Shawarma & Rolls', 'Chicken Shawarma', 'چکن شوارما', 180, '/Shawarmas/chicken-shawarma.webp', true),
  (20, 'Shawarma & Rolls', 'Chicken Cheese Shawarma', 'چکن چیز شوارما', 230, '/Shawarmas/chicken-shawarma-cheeze.webp', true),
  (21, 'Shawarma & Rolls', 'Zinger Shawarma', 'زنگر شوارما', 250, '/Shawarmas/zinger-shawarma.webp', true),
  (62, 'Shawarma & Rolls', 'Platter Shawarma', 'پلیٹر شوارما', 320, '/Shawarmas/shawarma-platter.webp', true),
  (22, 'Shawarma & Rolls', 'Zinger Cheese Shawarma', 'زنگر چیز شوارما', 300, '/Shawarmas/zinger-shawarma-cheeze.webp', true),
  (23, 'Shawarma & Rolls', 'Chicken Roll Paratha', 'چکن رول پراٹھا', 250, '/Shawarmas/chicken-roll.webp', true),
  (24, 'Shawarma & Rolls', 'Chicken Cheese Roll Paratha', 'چکن چیز رول پراٹھا', 300, '/Shawarmas/chicken-roll-cheeze.webp', true),
  (25, 'Shawarma & Rolls', 'Zinger Roll Paratha', 'زنگر رول پراٹھا', 300, '/Shawarmas/zinger-roll.webp', true),
  (26, 'Shawarma & Rolls', 'Zinger Cheese Roll Paratha', 'زنگر چیز رول پراٹھا', 350, '/Shawarmas/zinger-roll-cheeze.webp', true),
  (66, 'Shawarma & Rolls', 'Mayonnaise Small', 'میئونیز چھوٹا', 30, '/Burgers/mayonese-small.webp', true),
  (67, 'Shawarma & Rolls', 'Mayonnaise Big', 'میئونیز بڑا', 50, '/Burgers/mayonese-big.webp', true),
  (27, 'Chicken', 'Wings (6 Pcs)', 'ونگز 6 پیس', 350, '/chicken/wings.webp', true),
  (36, 'Chicken', 'Chicken Pieces Small', 'چکن پیس چھوٹا', 180, '/chicken/chicken-small.webp', true),
  (37, 'Chicken', 'Chicken Pieces Big', 'چکن پیس بڑا', 280, '/chicken/chicken-big.webp', true),
  (30, 'Chaat & Bhalle', 'Dahi Bhalle', 'دہی بھلے', 220, '/chats/dahi-bhala.webp', true),
  (31, 'Chaat & Bhalle', 'Chana Chaat', 'چنا چاٹ', 220, '/chats/channa-chat.webp', true),
  (32, 'Chaat & Bhalle', 'Papri Chaat', 'پاپڑی چاٹ', 220, '/chats/papri-chat.webp', true),
  (33, 'Chaat & Bhalle', 'Cream Fruit Chaat', 'کریم فروٹ چاٹ', 250, '/chats/fruit-chat.webp', true),
  (34, 'Chaat & Bhalle', 'Khatte Meethe Gol Gappe Half', 'کھٹے میٹھے گول گپے ہاف', 150, '/chats/gol-gappy-half.webp', true),
  (35, 'Chaat & Bhalle', 'Khatte Meethe Gol Gappe Full', 'کھٹے میٹھے گول گپے فل', 250, '/chats/gol-gappy-full.webp', true),
  (48, 'Ice Cream', 'Ice Cream Large', 'آئس کریم لارج', 270, '/Ice-Creams/Ice-cream-large.webp', true),
  (49, 'Ice Cream', 'Ice Cream Small', 'آئس کریم سمال', 180, '/Ice-Creams/Ice-cream-small.webp', true),
  (50, 'Ice Cream', 'Kulfa Falooda', 'قلفہ فالودہ', 300, '/Ice-Creams/khulfa-falooda.webp', false),
  (38, 'Juices & Shakes', 'Apple Banana Milkshake', 'سیب کیلا ملک شیک', 220, '/Juices/apple-banana-milk-shake.webp', true),
  (39, 'Juices & Shakes', 'Chiku Milkshake', 'چیکو ملک شیک', 220, '/Juices/chicu-shake.webp', false),
  (40, 'Juices & Shakes', 'Khajoor Banana Milkshake', 'کھجور کیلا ملک شیک', 250, '/Juices/date-banana-milk-shake.webp', true),
  (41, 'Juices & Shakes', 'Khajoor Badam Milkshake', 'کھجور بادام ملک شیک', 300, '/Juices/date-almond-shake.webp', true),
  (42, 'Juices & Shakes', 'Mint Margarita', 'منٹ مارگریٹا', 200, '/Juices/mint-margaretta.webp', true),
  (43, 'Juices & Shakes', 'Chocolate Shake', 'چاکلیٹ شیک', 300, '/Juices/choclate-shake.webp', true),
  (44, 'Juices & Shakes', 'Strawberry Milkshake', 'اسٹرابیری ملک شیک', 300, '/Juices/straw-berry-shake.webp', false),
  (45, 'Juices & Shakes', 'Falsa Juice', 'فالسہ جوس', 220, '/Juices/falsa-juice.webp', true),
  (46, 'Juices & Shakes', 'Pineapple Milkshake', 'پائن ایپل ملک شیک', 300, '/Juices/pine-apple-shake.webp', true),
  (47, 'Juices & Shakes', 'Ice Cream Milkshake', 'آئس کریم ملک شیک', 350, '/Juices/ice-cream-shake.webp', true),
  (73, 'Juices & Shakes', 'Mango Milkshake', 'آم ملک شیک', 220, '/Juices/mango-shake.webp', true),
  (51, 'Juices & Shakes', 'Almond Milkshake', 'آلو ملک شیک', 250, '/Juices/almond-shake.webp', false),
  (52, 'Juices & Shakes', 'Anar Juice', 'انار جوس', 300, '/Juices/anar-juice.webp', false),
  (53, 'Juices & Shakes', 'Apple Juice', 'سیب جوس', 300, '/Juices/apple-juice.webp', false),
  (54, 'Juices & Shakes', 'Carrot Juice', 'گاجر جوس', 160, '/Juices/carrot-juice.webp', false),
  (55, 'Juices & Shakes', 'Grape Fruit Juice', 'گریپ فروٹ جوس', 220, '/Juices/grapes-juice.webp', false),
  (56, 'Juices & Shakes', 'Oreo Chocolate Shake', 'Oreo چاکلیٹ شیک', 300, '/Juices/oreo-choclate-shake.webp', true),
  (57, 'Juices & Shakes', 'Pineapple Juice', 'پائن ایپل کا جوس', 300, '/Juices/pine-apple-juice.webp', true),
  (58, 'Juices & Shakes', 'Malta Juice', 'مالٹا جوس', 180, '/Juices/orange-juice.webp', false),
  (59, 'Cold Drinks', 'Cola Next (Regular)', 'کولا نیکسٹ ریگولر', 80, '/drinks/cola-regular.webp', true),
  (60, 'Cold Drinks', 'Cola Next (1 Ltr)', 'کولا نیکسٹ 1 لیٹر', 160, '/drinks/cola-1.webp', true),
  (61, 'Cold Drinks', 'Cola Next (1.5 Ltr)', 'کولا نیکسٹ 1.5 لیٹر', 200, '/drinks/cola-1.5.webp', true),
  (68, 'Cold Drinks', 'Fizzup (Regular)', 'فزاپ ریگولر', 80, '/drinks/fizzup-regular.webp', true),
  (69, 'Cold Drinks', 'Fizzup (1 Ltr)', 'فزاپ 1 لیٹر', 160, '/drinks/fizzup-1.webp', true),
  (70, 'Cold Drinks', 'Fizzup (1.5 Ltr)', 'فزاپ 1.5 لیٹر', 200, '/drinks/fizzup-1.5.webp', true),
  (71, 'Cold Drinks', 'Water Bottle (Small)', 'واٹر بوتل چھوٹی', 60, '/drinks/water-small.webp', true),
  (72, 'Cold Drinks', 'Water Bottle (Big)', 'واٹر بوتل بڑی', 120, '/drinks/water-large.webp', true)
on conflict (id) do nothing;

select setval('public.menu_items_id_seq', (select greatest(max(id), 1) from public.menu_items));

-- =========================================================
-- menu_item_option_groups / menu_item_option_choices — per-item variant
-- choices, e.g. a pizza's "Size" group (Small/Medium/Large) or "Flavour"
-- group (Regular/Spicy +Rs. 30). Each group is single-select (the customer
-- picks exactly one choice from it) and, when required, must be answered
-- before the item can be added to the cart. price_delta is added to the
-- item's base price — it can be 0, positive, or negative.
--
-- Deleting a menu item cascades to its groups and choices; deleting a group
-- cascades to its choices. Nothing here is branch-scoped directly — a
-- group/choice belongs to one menu_items row, which already belongs to one
-- branch.
-- =========================================================
create table if not exists public.menu_item_option_groups (
  id           bigserial primary key,
  menu_item_id bigint not null references public.menu_items(id) on delete cascade,
  name         text not null,
  required     boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_option_groups_menu_item_id on public.menu_item_option_groups (menu_item_id);

create table if not exists public.menu_item_option_choices (
  id              bigserial primary key,
  option_group_id bigint not null references public.menu_item_option_groups(id) on delete cascade,
  name            text not null,
  price_delta     numeric(10, 2) not null default 0,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_option_choices_group_id on public.menu_item_option_choices (option_group_id);

alter table public.menu_item_option_groups enable row level security;
alter table public.menu_item_option_choices enable row level security;

drop policy if exists "menu item option groups are publicly readable" on public.menu_item_option_groups;
create policy "menu item option groups are publicly readable"
  on public.menu_item_option_groups
  for select
  to anon, authenticated
  using (true);

drop policy if exists "menu item option choices are publicly readable" on public.menu_item_option_choices;
create policy "menu item option choices are publicly readable"
  on public.menu_item_option_choices
  for select
  to anon, authenticated
  using (true);

-- =========================================================
-- category_icons — lets an admin assign a custom emoji to a category
-- (mainly for categories they typed themselves in "Add item", which would
-- otherwise fall back to the generic plate icon in lib/menu-data.ts).
-- Branch-scoped since each branch has its own category set; deleting the
-- branch cleans these up.
-- =========================================================
create table if not exists public.category_icons (
  branch     text not null references public.branches(slug) on delete cascade,
  category   text not null,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (branch, category)
);

alter table public.category_icons enable row level security;

drop policy if exists "category icons are publicly readable" on public.category_icons;
create policy "category icons are publicly readable"
  on public.category_icons
  for select
  to anon, authenticated
  using (true);

-- Storage bucket for admin-uploaded item photos (public read, so <img src>
-- can hit the CDN URL directly with no auth). Writes only ever happen
-- through the service-role admin client, which bypasses storage RLS
-- entirely, so no insert/update/delete policy is needed here.
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu images are publicly readable" on storage.objects;
create policy "menu images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'menu-images');

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

drop trigger if exists trg_menu_items_updated_at on public.menu_items;
create trigger trg_menu_items_updated_at
  before update on public.menu_items
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
-- branches, menu_availability, menu_items, and site_settings are the
-- exceptions: none of them is sensitive (which shops exist, an in-stock
-- flag, the menu itself, a delivery on/off switch), and the public site
-- needs to read them directly, so they get public SELECT policies.
-- =========================================================
alter table public.branches enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.riders enable row level security;
alter table public.menu_availability enable row level security;
alter table public.menu_items enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "branches are publicly readable" on public.branches;
create policy "branches are publicly readable"
  on public.branches
  for select
  to anon, authenticated
  using (true);

drop policy if exists "menu items are publicly readable" on public.menu_items;
create policy "menu items are publicly readable"
  on public.menu_items
  for select
  to anon, authenticated
  using (true);

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
-- p_items shape: [{"id": 7, "name": "Zinger Burger", "category": "Burgers",
-- "unit_price": 400, "quantity": 2, "option_choice_ids": [12, 15]}, ...]
-- "id" matches menu_items.id and is checked there — a sold-out item can't
-- be ordered even if the customer's page was open before it was toggled
-- off, and menu_items.price always overrides the client-sent unit_price.
-- Every item must belong to p_branch or the whole order is rejected — this
-- also stops a stale/tampered client sending an id that doesn't exist (which
-- would otherwise fall back to trusting the client-sent price).
--
-- "option_choice_ids" is which menu_item_option_choices the customer picked
-- (e.g. one id for "Size: Large", one for "Flavour: Spicy") — optional, and
-- ignored/empty for an item with no option groups. Every required group on
-- that item must have exactly one choice selected, at most one choice per
-- group is allowed, and every choice must actually belong to that item —
-- all checked server-side, same as the base price. The chosen names get
-- folded into the order_items snapshot as "Zinger Burger (Large, Spicy)"
-- and their price_delta is added to the line's unit price.
--
-- p_latitude/p_longitude are optional (from the browser's geolocation, if the
-- customer grants permission) — delivery_address is always the primary
-- human-entered location.
-- =========================================================
drop function if exists public.place_order(text, text, text, text, jsonb);
drop function if exists public.place_order(text, text, text, text, jsonb, double precision, double precision);
drop function if exists public.place_order(text, text, text, text, jsonb, text, double precision, double precision);

create or replace function public.place_order(
  p_phone     text,
  p_name      text,
  p_address   text,
  p_notes     text,
  p_items     jsonb,
  p_branch    text,
  p_latitude  double precision default null,
  p_longitude double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_banned          boolean;
  v_order_id           uuid;
  v_subtotal           numeric(10, 2) := 0;
  v_delivery_fee       numeric(10, 2);
  v_sold_out_names     text;
  v_invalid_names      text;
  v_item               jsonb;
  v_mi                 record;
  v_option_ids         bigint[];
  v_bad_choice         boolean;
  v_dup_group          boolean;
  v_missing_group_name text;
  v_price_delta_sum    numeric(10, 2);
  v_chosen_names       text[];
  v_line_unit_price    numeric(10, 2);
  v_full_name          text;
  v_quantity           integer;
begin
  if p_branch is null or not exists (select 1 from public.branches where slug = p_branch) then
    raise exception 'Unknown branch.';
  end if;

  if not coalesce((select delivery_enabled from public.site_settings where branch = p_branch), true) then
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

  select string_agg(coalesce(item->>'name', item->>'id'), ', ')
  into v_invalid_names
  from jsonb_array_elements(p_items) as item
  where not exists (
    select 1 from public.menu_items mi
    where mi.id = (item->>'id')::bigint and mi.branch = p_branch
  );

  if v_invalid_names is not null then
    raise exception 'These items are not on this branch''s menu: %', v_invalid_names;
  end if;

  select string_agg(item->>'name', ', ')
  into v_sold_out_names
  from jsonb_array_elements(p_items) as item
  join public.menu_items mi on mi.id = (item->>'id')::bigint and mi.branch = p_branch
  where mi.is_available = false;

  if v_sold_out_names is not null then
    raise exception 'Sorry, these items just sold out: %', v_sold_out_names;
  end if;

  insert into public.customers (phone, branch, name)
  values (trim(p_phone), p_branch, nullif(trim(p_name), ''))
  on conflict (phone, branch) do update
    set name = coalesce(nullif(trim(excluded.name), ''), public.customers.name)
  returning is_banned into v_is_banned;

  if v_is_banned then
    raise exception 'This phone number is banned from placing orders.';
  end if;

  -- Delivery charge isn't collected from the customer at order time — it's
  -- confirmed over WhatsApp and set by the admin per order afterwards.
  v_delivery_fee := 0;

  -- Created with a placeholder total, corrected below once every line
  -- (including its option price deltas) has been validated and priced.
  insert into public.orders (customer_phone, branch, delivery_address, latitude, longitude, notes, delivery_fee, total_amount)
  values (trim(p_phone), p_branch, trim(p_address), p_latitude, p_longitude, nullif(trim(p_notes), ''), v_delivery_fee, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- menu_items.price always wins over whatever price the client sent, so a
    -- stale page can't under-charge (or over-charge) against the admin's
    -- current rate. (The bulk check above already guarantees a match exists.)
    select id, name, price into v_mi
    from public.menu_items
    where id = (v_item->>'id')::bigint and branch = p_branch;

    select coalesce(array_agg((elem)::bigint), array[]::bigint[])
    into v_option_ids
    from jsonb_array_elements_text(coalesce(v_item->'option_choice_ids', '[]'::jsonb)) as elem;

    select exists (
      select 1 from unnest(v_option_ids) as cid
      where not exists (
        select 1
        from public.menu_item_option_choices c
        join public.menu_item_option_groups g on g.id = c.option_group_id
        where c.id = cid and g.menu_item_id = v_mi.id
      )
    ) into v_bad_choice;

    if v_bad_choice then
      raise exception 'Invalid option selected for %.', v_mi.name;
    end if;

    select exists (
      select 1
      from public.menu_item_option_choices
      where id = any(v_option_ids)
      group by option_group_id
      having count(*) > 1
    ) into v_dup_group;

    if v_dup_group then
      raise exception 'Only one choice is allowed per option for %.', v_mi.name;
    end if;

    select g.name into v_missing_group_name
    from public.menu_item_option_groups g
    where g.menu_item_id = v_mi.id and g.required
      and not exists (
        select 1 from public.menu_item_option_choices c
        where c.option_group_id = g.id and c.id = any(v_option_ids)
      )
    limit 1;

    if v_missing_group_name is not null then
      raise exception 'Please choose a % for %.', v_missing_group_name, v_mi.name;
    end if;

    select coalesce(sum(price_delta), 0), coalesce(array_agg(name order by sort_order), array[]::text[])
    into v_price_delta_sum, v_chosen_names
    from public.menu_item_option_choices
    where id = any(v_option_ids);

    v_line_unit_price := v_mi.price + v_price_delta_sum;
    v_full_name := v_mi.name || case when coalesce(array_length(v_chosen_names, 1), 0) > 0 then ' (' || array_to_string(v_chosen_names, ', ') || ')' else '' end;
    v_quantity := (v_item->>'quantity')::integer;

    insert into public.order_items (order_id, item_name, item_category, unit_price, quantity)
    values (v_order_id, v_full_name, v_item->>'category', v_line_unit_price, v_quantity);

    v_subtotal := v_subtotal + v_line_unit_price * v_quantity;
  end loop;

  update public.orders set total_amount = v_subtotal + v_delivery_fee where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(text, text, text, text, jsonb, text, double precision, double precision) to anon, authenticated;

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
drop function if exists public.get_customer_info(text);

create or replace function public.get_customer_info(p_phone text, p_branch text)
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
    where o2.customer_phone = c.phone and o2.branch = c.branch and o2.delivery_address is not null
    order by o2.created_at desc
    limit 1
  ) o on true
  where c.phone = trim(p_phone) and c.branch = p_branch and c.is_banned = false;
end;
$$;

grant execute on function public.get_customer_info(text, text) to anon, authenticated;

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
-- Admin login setup: nothing to run here. Each branch is a separate
-- username/password pair in env vars, checked entirely outside the
-- database (see lib/admin-auth.ts):
--   Ghouri Town: ADMIN_USERNAME, ADMIN_PASSWORD           (already set)
--   Khana:       ADMIN_KHANA_USERNAME, ADMIN_KHANA_PASSWORD (add these)
-- Both branches share ADMIN_SESSION_SECRET. See .env.example.
-- =========================================================
