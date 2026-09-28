-- Orleia billing tables (paste into Supabase SQL editor, run once)
create table if not exists noor_usage (
  device_id text not null,
  day text not null,
  n integer not null default 0,
  primary key (device_id, day)
);

create table if not exists billing_license (
  device_id text primary key,
  tier text not null default 'free',
  status text not null default 'active',
  customer_id text,
  subscription_id text,
  period_end text,
  cancel_at_period_end boolean default false,
  updated_at timestamptz default now()
);

-- Lock down: no anon/authenticated access at all (service key bypasses RLS).
alter table noor_usage enable row level security;
alter table billing_license enable row level security;
revoke all on noor_usage from anon, authenticated;
revoke all on billing_license from anon, authenticated;

-- Atomic daily counter increment (single round-trip, race-free).
create or replace function incr_noor_usage(p_device text, p_day text)
returns integer language sql as $$
  insert into noor_usage (device_id, day, n) values (p_device, p_day, 1)
  on conflict (device_id, day) do update set n = noor_usage.n + 1
  returning n;
$$;
