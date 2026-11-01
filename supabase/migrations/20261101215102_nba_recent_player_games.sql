-- Recent box scores for every player whose CURRENT team (team of his latest game)
-- is in p_teams. One row per player with a compact, newest-first game list.
create or replace function public.nba_recent_player_games(p_teams text[], p_limit integer default 20)
returns table (player_id integer, player_name text, team text, games jsonb)
language sql
stable
set search_path = public
as $$
  with latest as (
    select distinct on (g.player_id) g.player_id, g.player_name, g.team
    from public.nba_player_games g
    order by g.player_id, g.game_date desc
  ), ranked as (
    select g.*, row_number() over (partition by g.player_id order by g.game_date desc) as rn
    from public.nba_player_games g
    join latest l on l.player_id = g.player_id
    where l.team = any(p_teams)
  )
  select l.player_id, l.player_name, l.team,
    jsonb_agg(jsonb_build_array(r.game_date, r.opponent, r.is_home, r.minutes, r.pts, r.reb, r.ast, r.fg3m, r.season, r.team) order by r.game_date desc) as games
  from latest l
  join ranked r on r.player_id = l.player_id and r.rn <= least(greatest(p_limit, 1), 82)
  group by l.player_id, l.player_name, l.team;
$$;
revoke all on function public.nba_recent_player_games(text[], integer) from public, anon, authenticated;
grant execute on function public.nba_recent_player_games(text[], integer) to service_role;
