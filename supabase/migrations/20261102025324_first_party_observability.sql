-- First-party observability without personal data: real-user Web Vitals and
-- technical errors. No user id, no IP, no full URL (route pattern only).
create table if not exists public.web_vitals (
  id bigint generated always as identity primary key,
  metric text not null check (metric in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')),
  value double precision not null check (value >= 0 and value < 600000),
  rating text not null check (rating in ('good', 'needs-improvement', 'poor')),
  route text not null check (length(route) between 1 and 80),
  device text not null check (device in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);
create index if not exists web_vitals_created on public.web_vitals (created_at desc);

create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  source text not null check (source in ('client', 'server')),
  route text not null check (length(route) between 1 and 80),
  message text not null check (length(message) between 1 and 300),
  status integer check (status between 100 and 599),
  created_at timestamptz not null default now()
);
create index if not exists app_errors_created on public.app_errors (created_at desc);

alter table public.web_vitals enable row level security;
alter table public.app_errors enable row level security;
revoke all on public.web_vitals from anon, authenticated;
revoke all on public.app_errors from anon, authenticated;

-- Inserts go through this function: it refuses bursts (flooding protection)
-- and keeps 30 days of history.
create or replace function public.telemetry_insert(p_kind text, p_row jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare recent integer;
begin
  if p_kind = 'vital' then
    select count(*) into recent from public.web_vitals where created_at > now() - interval '1 minute';
    if recent >= 600 then return false; end if;
    insert into public.web_vitals (metric, value, rating, route, device)
    values (p_row->>'metric', (p_row->>'value')::double precision, p_row->>'rating', p_row->>'route', p_row->>'device');
    if random() < 0.01 then delete from public.web_vitals where created_at < now() - interval '30 days'; end if;
  elsif p_kind = 'error' then
    select count(*) into recent from public.app_errors where created_at > now() - interval '1 minute';
    if recent >= 120 then return false; end if;
    insert into public.app_errors (source, route, message, status)
    values (p_row->>'source', p_row->>'route', p_row->>'message', nullif(p_row->>'status', '')::integer);
    if random() < 0.01 then delete from public.app_errors where created_at < now() - interval '30 days'; end if;
  else
    return false;
  end if;
  return true;
end;
$$;
revoke all on function public.telemetry_insert(text, jsonb) from public, anon, authenticated;
grant execute on function public.telemetry_insert(text, jsonb) to service_role;

-- One summary for the owner's health panel.
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
