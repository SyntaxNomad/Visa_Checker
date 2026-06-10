-- Phase 0 security migration
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- What it does:
--   1. Adds double opt-in columns (confirmed, confirm_token).
--   2. Grandfathers existing subscribers as confirmed (they signed up
--      intentionally before opt-in existed).
--   3. Removes ALL anon/authenticated access to the table. Every read/write
--      now goes through the service-role key in the serverless functions and
--      the GitHub Action — the browser no longer talks to Supabase.
--   4. Adds a uniqueness guard so the same email can't pile up duplicate
--      rows for the same route.

-- 1. Double opt-in columns
alter table public.subscriptions
  add column if not exists confirmed boolean not null default false,
  add column if not exists confirm_token uuid;

-- 2. Grandfather pre-existing subscribers
update public.subscriptions set confirmed = true where confirm_token is null;

-- 3. Lock the table down: drop every existing policy, keep RLS enabled with
--    no policies. The service-role key bypasses RLS; anon/authenticated keys
--    get nothing (no reads — the subscriber email list must never be
--    publicly readable via the anon key).
alter table public.subscriptions enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions'
  loop
    execute format('drop policy %I on public.subscriptions', p.policyname);
  end loop;
end $$;

revoke all on public.subscriptions from anon, authenticated;

-- 4. One row per (email, route)
create unique index if not exists subscriptions_unique_route
  on public.subscriptions (email, passport, destination, residence);

-- 5. Fast lookup for the confirmation endpoint
create index if not exists subscriptions_confirm_token_idx
  on public.subscriptions (confirm_token)
  where confirm_token is not null;
