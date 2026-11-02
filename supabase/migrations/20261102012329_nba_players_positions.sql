-- Official position per player (source: stats.nba.com PlayerIndex, sent by the owner's script).
create table if not exists public.nba_players (
  player_id integer primary key check (player_id > 0),
  player_name text not null check (length(player_name) between 1 and 80),
  team text check (team ~ '^[A-Z]{3}$'),
  position text not null check (position ~ '^[GFC](-[GFC])?$'),
  season text not null check (season ~ '^[0-9]{4}-[0-9]{2}$'),
  source text not null default 'stats.nba.com',
  updated_at timestamptz not null default now()
);
alter table public.nba_players enable row level security;
revoke all on public.nba_players from anon, authenticated;

-- What each team allows per game to opposing players of each primary position
-- (first letter of the official position: G, F or C) in one season.
create or replace function public.nba_team_allowed_by_position(p_season text)
returns table (team text, pos text, games integer, pts numeric, reb numeric, ast numeric, fg3m numeric)
language sql
stable
set search_path = public
as $$
  with g as (
    select x.opponent, x.game_id, left(p.position, 1) as pos, x.pts, x.reb, x.ast, x.fg3m
    from public.nba_player_games x
    join public.nba_players p on p.player_id = x.player_id
    where x.season = p_season
  ), played as (
    select opponent, count(distinct game_id)::integer as games
    from public.nba_player_games where season = p_season group by opponent
  )
  select g.opponent, g.pos, pl.games,
         round(sum(g.pts)::numeric / pl.games, 2),
         round(sum(g.reb)::numeric / pl.games, 2),
         round(sum(g.ast)::numeric / pl.games, 2),
         round(sum(g.fg3m)::numeric / pl.games, 2)
  from g join played pl on pl.opponent = g.opponent
  group by g.opponent, g.pos, pl.games;
$$;
revoke all on function public.nba_team_allowed_by_position(text) from public, anon, authenticated;
grant execute on function public.nba_team_allowed_by_position(text) to service_role;
