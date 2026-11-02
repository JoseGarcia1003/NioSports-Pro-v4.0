-- Recent games per team (newest first) with points scored and allowed, summed from
-- the stored player box scores (stats.nba.com lists every player who played).
create or replace function public.nba_team_recent_games(p_teams text[], p_limit integer default 20)
returns table (team text, games jsonb)
language sql
stable
set search_path = public
as $$
  with t as (
    select game_id, team, opponent, is_home, game_date, season, sum(pts)::integer as pf
    from public.nba_player_games
    where team = any(p_teams)
    group by game_id, team, opponent, is_home, game_date, season
  ), o as (
    select game_id, team, sum(pts)::integer as pa
    from public.nba_player_games
    where opponent = any(p_teams)
    group by game_id, team
  ), r as (
    select t.*, o.pa, row_number() over (partition by t.team order by t.game_date desc, t.game_id desc) as n
    from t join o on o.game_id = t.game_id and o.team = t.opponent
  )
  select team, jsonb_agg(jsonb_build_array(game_date, opponent, is_home, pf, pa, season) order by game_date desc, game_id desc)
  from r where n <= least(greatest(p_limit, 1), 82)
  group by team;
$$;
revoke all on function public.nba_team_recent_games(text[], integer) from public, anon, authenticated;
grant execute on function public.nba_team_recent_games(text[], integer) to service_role;
