-- Server-only cache for third-party sports data (protects free API quotas).
create table if not exists public.provider_cache (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.provider_locks (
  key text primary key,
  locked_until timestamptz not null
);
alter table public.provider_cache enable row level security;
alter table public.provider_locks enable row level security;
revoke all on public.provider_cache, public.provider_locks from anon, authenticated;

-- Returns true only for the caller that obtains (or takes over an expired) lock.
create or replace function public.try_provider_lock(p_key text, p_seconds integer)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  insert into public.provider_locks as l (key, locked_until)
  values (p_key, now() + make_interval(secs => p_seconds))
  on conflict (key) do update set locked_until = excluded.locked_until
  where l.locked_until < now();
  return found;
end;
$$;
revoke all on function public.try_provider_lock(text, integer) from public, anon, authenticated;
grant execute on function public.try_provider_lock(text, integer) to service_role;
