-- ============================================================
-- Orleia push store tables (run once in Supabase SQL Editor)
-- Backs background push notifications:
--   push_subs  — one row per registered device (push subscription)
--   push_sched — one row per device with an armed reminder schedule
-- Service-key only: RLS on, no policies, grants revoked from
-- anon/authenticated. The server uses SUPABASE_SERVICE_ROLE_KEY.
-- ============================================================

create table if not exists push_subs (
  endpoint   text primary key,
  device_id  text,
  keys       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists push_sched (
  endpoint   text primary key,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on every write (used to evict stale schedules).
create or replace function orleia_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists push_subs_touch on push_subs;
create trigger push_subs_touch
  before insert or update on push_subs
  for each row execute function orleia_touch_updated_at();

drop trigger if exists push_sched_touch on push_sched;
create trigger push_sched_touch
  before insert or update on push_sched
  for each row execute function orleia_touch_updated_at();

-- Lock down: only the service key may read/write.
alter table push_subs  enable row level security;
alter table push_sched enable row level security;

revoke all on push_subs  from anon, authenticated;
revoke all on push_sched from anon, authenticated;

-- Housekeeping: schedules older than 7 days are dead weight (devices
-- re-arm every 15 minutes while the app is used at all).
-- Optional manual cleanup:
--   delete from push_sched where updated_at < now() - interval '7 days';
--   delete from push_subs  where updated_at < now() - interval '90 days';
