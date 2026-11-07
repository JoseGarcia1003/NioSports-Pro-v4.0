-- Responsible-use limits for the personal bankroll log, and an append-only
-- audit of every change (who asked what, when, and what was deferred).
create table if not exists public.bankroll_limits (
  user_id text primary key,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object' and pg_column_size(state) < 4096),
  updated_at timestamptz not null default now()
);
create table if not exists public.bankroll_limit_events (
  id bigint generated always as identity primary key,
  user_id text not null,
  request jsonb not null check (pg_column_size(request) < 4096),
  applied jsonb not null,
  deferred jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists bankroll_limit_events_user on public.bankroll_limit_events (user_id, id desc);
alter table public.bankroll_limits enable row level security;
alter table public.bankroll_limit_events enable row level security;
revoke all on public.bankroll_limits, public.bankroll_limit_events from anon, authenticated;
revoke update, delete, truncate on public.bankroll_limit_events from service_role;
create or replace function public.bankroll_limit_events_immutable()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'Limit history is append-only'; end; $$;
drop trigger if exists bankroll_limit_events_no_change on public.bankroll_limit_events;
create trigger bankroll_limit_events_no_change before update or delete on public.bankroll_limit_events
  for each row execute function public.bankroll_limit_events_immutable();
