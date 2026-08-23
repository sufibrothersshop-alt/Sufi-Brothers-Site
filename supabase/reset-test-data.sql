-- Wipes all test data created while building/testing the site:
-- test orders (and their order_items via cascade), the test rider, and the
-- test customers. Menu availability/pricing overrides are left untouched.
--
-- Run this in Supabase SQL Editor. Order matters (foreign keys):
-- order_items -> orders -> riders -> customers.

delete from public.order_items;
delete from public.orders;
delete from public.riders;
delete from public.customers;
