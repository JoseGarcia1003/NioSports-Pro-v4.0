-- Additive tennis storage, independent of NBA and bankroll migrations.
-- A snapshot is one atomic provider delivery; its ID is the SHA-256 of its content.
create table public.tennis_snapshots (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  provider text not null,
  fetched_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload jsonb not null,
  unique(provider, fetched_at),
  check (payload @> '{"isDemo":false,"version":1}'::jsonb),
  check (payload ?& array['players','matches','history']),
  check (jsonb_typeof(payload->'players') = 'array'),
  check (jsonb_typeof(payload->'matches') = 'array'),
  check (jsonb_typeof(payload->'history') = 'array'),
  check (octet_length(payload::text) <= 12000000)
);
create index tennis_snapshots_latest on public.tennis_snapshots(provider, fetched_at desc);
create table public.tennis_analyses (
  snapshot_id text not null references public.tennis_snapshots(id),
  match_id text not null,
  model_version text not null,
  calculated_at timestamptz not null default now(),
  result jsonb not null,
  primary key(snapshot_id, match_id, model_version),
  check (result->>'status' in ('abstained','experimental'))
);
alter table public.tennis_snapshots enable row level security;
alter table public.tennis_analyses enable row level security;
revoke all on public.tennis_snapshots, public.tennis_analyses from public, anon, authenticated;
grant select, insert on public.tennis_snapshots, public.tennis_analyses to service_role;
comment on table public.tennis_snapshots is 'Licensed sports feed; server-only, immutable delivery snapshots. No synthetic data.';
comment on table public.tennis_analyses is 'Experimental model outputs bound to exact source snapshots. Not settlement or betting instructions.';
