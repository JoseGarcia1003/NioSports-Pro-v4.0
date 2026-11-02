-- Season totals per player (box-score sums) for the leaders tables.
-- Per-game averages and percentages are derived in the app from these sums.
create or replace function public.nba_player_season(p_season text, p_season_type text default 'Regular Season')
returns table (player_id integer, player_name text, team text, gp integer, w integer, l integer,
  min numeric, pts integer, fgm integer, fga integer, fg3m integer, fg3a integer, ftm integer, fta integer,
  oreb integer, dreb integer, reb integer, ast integer, tov integer, stl integer, blk integer, pf integer, plus_minus integer)
language sql
stable
set search_path = public
as $$
  select g.player_id,
         (array_agg(g.player_name order by g.game_date desc))[1],
         (array_agg(g.team order by g.game_date desc))[1],
         count(*)::integer,
         count(*) filter (where g.won)::integer,
         count(*) filter (where g.won = false)::integer,
         sum(g.minutes), sum(g.pts)::integer, sum(g.fgm)::integer, sum(g.fga)::integer, sum(g.fg3m)::integer, sum(g.fg3a)::integer,
         sum(g.ftm)::integer, sum(g.fta)::integer, sum(g.oreb)::integer, sum(g.dreb)::integer, sum(g.reb)::integer, sum(g.ast)::integer,
         sum(g.tov)::integer, sum(g.stl)::integer, sum(g.blk)::integer, sum(g.pf)::integer, coalesce(sum(g.plus_minus), 0)::integer
  from public.nba_player_games g
  where g.season = p_season and g.season_type = p_season_type
  group by g.player_id;
$$;
revoke all on function public.nba_player_season(text, text) from public, anon, authenticated;
grant execute on function public.nba_player_season(text, text) to service_role;

-- One row per team and game (team box score summed from its players, plus the
-- opponent's points) for standings and team statistics.
create or replace function public.nba_team_season_games(p_season text, p_season_type text default 'Regular Season')
returns table (team text, game_id text, game_date date, is_home boolean, opponent text, pts integer, opp_pts integer,
  fgm integer, fga integer, fg3m integer, fg3a integer, ftm integer, fta integer, oreb integer, dreb integer, reb integer,
  ast integer, tov integer, stl integer, blk integer, pf integer)
language sql
stable
set search_path = public
as $$
  with t as (
    select g.team, g.game_id, g.game_date, g.is_home, g.opponent,
           sum(g.pts)::integer pts, sum(g.fgm)::integer fgm, sum(g.fga)::integer fga, sum(g.fg3m)::integer fg3m, sum(g.fg3a)::integer fg3a,
           sum(g.ftm)::integer ftm, sum(g.fta)::integer fta, sum(g.oreb)::integer oreb, sum(g.dreb)::integer dreb, sum(g.reb)::integer reb,
           sum(g.ast)::integer ast, sum(g.tov)::integer tov, sum(g.stl)::integer stl, sum(g.blk)::integer blk, sum(g.pf)::integer pf
    from public.nba_player_games g
    where g.season = p_season and g.season_type = p_season_type
    group by g.team, g.game_id, g.game_date, g.is_home, g.opponent
  )
  select t.team, t.game_id, t.game_date, t.is_home, t.opponent, t.pts, o.pts,
         t.fgm, t.fga, t.fg3m, t.fg3a, t.ftm, t.fta, t.oreb, t.dreb, t.reb, t.ast, t.tov, t.stl, t.blk, t.pf
  from t join t o on o.game_id = t.game_id and o.team = t.opponent
  order by t.team, t.game_date desc;
$$;
revoke all on function public.nba_team_season_games(text, text) from public, anon, authenticated;
grant execute on function public.nba_team_season_games(text, text) to service_role;
