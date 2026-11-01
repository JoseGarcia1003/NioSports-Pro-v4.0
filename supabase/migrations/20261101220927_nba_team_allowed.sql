-- What each team allows per game (all opposing players combined) in one season.
create or replace function public.nba_team_allowed(p_season text)
returns table (team text, games integer, pts numeric, reb numeric, ast numeric, fg3m numeric)
language sql
stable
set search_path = public
as $$
  select g.opponent as team,
         count(distinct g.game_id)::integer as games,
         round(sum(g.pts)::numeric / count(distinct g.game_id), 2),
         round(sum(g.reb)::numeric / count(distinct g.game_id), 2),
         round(sum(g.ast)::numeric / count(distinct g.game_id), 2),
         round(sum(g.fg3m)::numeric / count(distinct g.game_id), 2)
  from public.nba_player_games g
  where g.season = p_season
  group by g.opponent;
$$;
revoke all on function public.nba_team_allowed(text) from public, anon, authenticated;
grant execute on function public.nba_team_allowed(text) to service_role;
