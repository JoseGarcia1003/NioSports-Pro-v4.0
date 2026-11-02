-- Daily NBA signal editions, sealed before tip-off and never edited afterwards.
create table if not exists public.nba_signal_editions (
  day date primary key,
  sealed_at timestamptz not null default now(),
  method text not null,
  entries jsonb not null check (jsonb_typeof(entries) = 'array')
);
alter table public.nba_signal_editions enable row level security;
revoke all on public.nba_signal_editions from anon, authenticated;

create or replace function public.nba_signal_editions_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Sealed signal editions cannot be modified or deleted';
end;
$$;
drop trigger if exists nba_signal_editions_no_change on public.nba_signal_editions;
create trigger nba_signal_editions_no_change
  before update or delete on public.nba_signal_editions
  for each row execute function public.nba_signal_editions_immutable();
