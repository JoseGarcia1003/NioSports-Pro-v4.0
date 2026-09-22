-- Daily editions are immutable. Browser roles never read the underlying payload.
create table public.prediction_editions (
  day date primary key,
  published_at timestamptz not null default now(),
  payload jsonb not null,
  check (payload @> '{"version":1,"isDemo":false}'::jsonb),
  check (payload ?& array['entries','freePickId','day','timezone']),
  check ((payload->>'day' = day::text) is true),
  check ((payload->>'timezone' = 'America/Guayaquil') is true),
  check ((jsonb_typeof(payload->'freePickId') = 'string') is true),
  check (length(payload->>'freePickId') between 1 and 160),
  check ((jsonb_typeof(payload->'entries') = 'array') is true),
  check (jsonb_array_length(payload->'entries') between 1 and 200),
  check (octet_length(payload::text) <= 2000000)
);
create table public.prediction_withdrawals (
  day date not null references public.prediction_editions(day),
  entry_id text not null,
  reason text not null check(length(reason) between 1 and 500),
  withdrawn_at timestamptz not null default now(),
  primary key(day,entry_id)
);
alter table public.prediction_editions enable row level security;
alter table public.prediction_withdrawals enable row level security;
revoke all on public.prediction_editions,public.prediction_withdrawals from public,anon,authenticated,service_role;
grant select,insert on public.prediction_editions,public.prediction_withdrawals to service_role;
