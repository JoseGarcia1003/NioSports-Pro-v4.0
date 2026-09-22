-- Preserve all records while separating public sports data from private accounts.
do $$
declare name text;
begin
  foreach name in array array['teams','games','team_stats','predictions','odds_snapshots','model_versions'] loop
    execute format('alter table public.%I enable row level security',name);
    execute format('revoke all on public.%I from public,anon,authenticated',name);
    execute format('grant select on public.%I to anon,authenticated',name);
    execute format('create policy public_sports_read on public.%I for select to anon,authenticated using (true)',name);
  end loop;
end $$;

alter table public.user_profiles enable row level security;
alter table public.picks enable row level security;
alter table public.bankroll_transactions enable row level security;
alter policy profile_user_all on public.user_profiles to authenticated;
alter policy profile_user_select on public.user_profiles to authenticated;
alter policy picks_user_select on public.picks to authenticated;
alter policy picks_user_insert on public.picks to authenticated;
alter policy picks_user_update on public.picks to authenticated;
alter policy picks_user_delete on public.picks to authenticated;
alter policy bankroll_user_select on public.bankroll_transactions to authenticated;
alter policy bankroll_user_insert on public.bankroll_transactions to authenticated;

revoke all on public.user_profiles,public.picks,public.bankroll_transactions from public,anon,authenticated;
grant select,insert,update,delete on public.picks to authenticated;
grant select on public.user_profiles,public.bankroll_transactions to authenticated;
-- PostgREST upsert includes the conflict key in UPDATE; RLS still forbids changing ownership.
grant insert(id,email,display_name,experience_level,default_odds,onboarding_done,theme,updated_at),
  update(id,email,display_name,experience_level,default_odds,onboarding_done,theme,updated_at)
  on public.user_profiles to authenticated;
-- Legacy accounting stays readable; new movements use the verified server ledger.
