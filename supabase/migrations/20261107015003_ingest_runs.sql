-- History of every synchronisation (scheduled, on demand or pushed): which
-- sport, data kind and provider, what came in, what was rejected, how fresh the
-- data is and why it failed. Append-only, so the operational record is honest.
create table if not exists public.ingest_runs (
  id bigint generated always as identity primary key,
  sport text not null check (sport in ('nba', 'football', 'tennis', 'mlb')),
  kind text not null check (kind in ('schedule', 'results', 'boxscores', 'odds', 'injuries', 'lineups', 'anchors')),
  provider text not null check (provider ~ '^[a-z0-9-]+$'),
  trigger text not null check (trigger in ('cron', 'manual', 'push')),
  status text not null check (status in ('ok', 'partial', 'failed', 'skipped')),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  records_in integer not null default 0 check (records_in >= 0),
  records_valid integer not null default 0 check (records_valid >= 0),
  records_rejected integer not null default 0 check (records_rejected >= 0),
  data_as_of text,
  error_code text check (error_code is null or error_code ~ '^[a-z0-9_:-]{1,80}$'),
  details jsonb not null default '{}'::jsonb check (pg_column_size(details) < 16384),
  check (finished_at >= started_at),
  check (records_valid + records_rejected <= records_in)
);
create index if not exists ingest_runs_recent on public.ingest_runs (sport, kind, finished_at desc);
alter table public.ingest_runs enable row level security;
revoke all on public.ingest_runs from anon, authenticated;
revoke update, delete, truncate on public.ingest_runs from service_role;

create or replace function public.ingest_runs_immutable()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'Ingest runs are append-only'; end; $$;
drop trigger if exists ingest_runs_no_change on public.ingest_runs;
create trigger ingest_runs_no_change before update or delete on public.ingest_runs
  for each row execute function public.ingest_runs_immutable();

-- Owner health panel: add the seal ledger and the latest run per sport/kind.
create or replace function public.ops_health()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'stats', (select jsonb_build_object('lastGame', max(game_date), 'lastIngest', max(ingested_at), 'rows', count(*)) from public.nba_player_games),
    'positions', (select count(*) from public.nba_players),
    'signals', (select jsonb_build_object('editions', count(*), 'lastDay', max(day)) from public.nba_signal_editions),
    'seals', (select jsonb_build_object('count', count(*), 'last', max(sealed_at),
                'anchored', (select count(distinct seal_hash) from public.prediction_seal_anchors)) from public.prediction_seals),
    'runs', (select coalesce(jsonb_agg(r order by r.sport, r.kind), '[]'::jsonb) from (
                select distinct on (sport, kind) sport, kind, provider, status, finished_at, records_valid, records_rejected, data_as_of, error_code
                from public.ingest_runs order by sport, kind, finished_at desc) r),
    'failedRuns24h', (select count(*) from public.ingest_runs where status = 'failed' and finished_at > now() - interval '24 hours'),
    'cache', (select coalesce(jsonb_agg(jsonb_build_object('key', key, 'updatedAt', updated_at,
                'fetchedAt', payload->>'fetchedAt', 'quotaRemaining', payload->'quotaRemaining',
                'creditsPerGame', payload->'creditsPerGame', 'upstreamStatus', payload->'upstreamStatus', 'market', payload->>'market')), '[]'::jsonb)
              from public.provider_cache where key not like '%:lock'),
    'vitals', (select coalesce(jsonb_agg(v), '[]'::jsonb) from (
                select metric, device, count(*) as n,
                       round((percentile_cont(0.75) within group (order by value))::numeric, 3) as p75
                from public.web_vitals where created_at > now() - interval '7 days'
                group by metric, device order by metric, device) v),
    'errors24h', (select count(*) from public.app_errors where created_at > now() - interval '24 hours'),
    'topErrors', (select coalesce(jsonb_agg(e), '[]'::jsonb) from (
                select source, route, message, count(*) as n, max(created_at) as last
                from public.app_errors where created_at > now() - interval '7 days'
                group by source, route, message order by count(*) desc limit 5) e)
  );
$$;
revoke all on function public.ops_health() from public, anon, authenticated;
grant execute on function public.ops_health() to service_role;
