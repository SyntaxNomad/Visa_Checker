-- Phase 1: reliable change detection
-- Run this in the Supabase SQL editor AFTER the phase0 migration.
--
-- Routes become first-class: each unique passport→destination pair gets one
-- status row, checked once per day regardless of how many people subscribed
-- to it. Changes go through a candidate/confirmation state machine before
-- any alert email is sent, and every confirmed change is recorded in a
-- history table (which will later power the public change-timeline pages).

create table if not exists public.route_status (
  passport         text not null,
  destination      text not null,
  -- the status users are shown / alerted about; only changes after debounce
  confirmed_status text,
  -- a pending change that hasn't been confirmed yet
  candidate_status text,
  -- how many consecutive daily runs the candidate has held
  candidate_streak integer not null default 0,
  -- where confirmed_status came from: 'dataset' | 'gemini'
  source           text,
  last_verified_at timestamptz,
  updated_at       timestamptz not null default now(),
  primary key (passport, destination)
);

create table if not exists public.route_status_history (
  id          bigint generated always as identity primary key,
  passport    text not null,
  destination text not null,
  old_status  text,
  new_status  text not null,
  source      text not null,
  detected_at timestamptz not null default now()
);

create index if not exists route_status_history_route_idx
  on public.route_status_history (passport, destination, detected_at desc);

-- Same lockdown posture as subscriptions: service-role only.
alter table public.route_status enable row level security;
alter table public.route_status_history enable row level security;
revoke all on public.route_status from anon, authenticated;
revoke all on public.route_status_history from anon, authenticated;
