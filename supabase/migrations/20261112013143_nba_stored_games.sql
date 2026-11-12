-- Games already stored since a date, with their row count. Lets the server-side
-- box score sync decide what is missing without downloading thousands of rows.
create or replace function public.nba_stored_games(p_from date)
returns table (game_id text, n bigint)
language sql
stable
set search_path = public
as $$
  select game_id, count(*) from public.nba_player_games where game_date >= p_from group by game_id;
$$;
revoke all on function public.nba_stored_games(date) from public, anon, authenticated;
grant execute on function public.nba_stored_games(date) to service_role;

-- Teams with a stored game on each of the given days (to void signals of
-- players who did not play instead of leaving them pending forever).
create or replace function public.nba_teams_played(p_days date[])
returns table (team text, game_date date)
language sql
stable
set search_path = public
as $$
  select distinct team, game_date from public.nba_player_games where game_date = any(p_days);
$$;
revoke all on function public.nba_teams_played(date[]) from public, anon, authenticated;
grant execute on function public.nba_teams_played(date[]) to service_role;

-- Least privilege: trigger functions are never called through the API.
revoke all on function public.nba_signal_editions_immutable() from public, anon, authenticated;
revoke all on function public.prediction_seals_check() from public, anon, authenticated;
revoke all on function public.prediction_seals_immutable() from public, anon, authenticated;
revoke all on function public.ingest_runs_immutable() from public, anon, authenticated;
revoke all on function public.bankroll_limit_events_immutable() from public, anon, authenticated;
