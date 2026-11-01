-- Player box scores per game (source: stats.nba.com via nba_api, ingested from the owner's PC).
create table if not exists public.nba_player_games (
  game_id text not null check (game_id ~ '^[0-9]{10}$'),
  player_id integer not null check (player_id > 0),
  season text not null check (season ~ '^[0-9]{4}-[0-9]{2}$'),
  season_type text not null check (season_type in ('Regular Season', 'Playoffs', 'PlayIn')),
  game_date date not null,
  player_name text not null,
  team text not null check (team ~ '^[A-Z]{3}$'),
  opponent text not null check (opponent ~ '^[A-Z]{3}$'),
  is_home boolean not null,
  won boolean,
  minutes numeric(5,2) not null check (minutes >= 0 and minutes <= 80),
  pts smallint not null check (pts between 0 and 120),
  reb smallint not null check (reb between 0 and 60),
  ast smallint not null check (ast between 0 and 40),
  fg3m smallint not null check (fg3m between 0 and 30),
  fg3a smallint not null check (fg3a between 0 and 50),
  fgm smallint not null check (fgm between 0 and 50),
  fga smallint not null check (fga between 0 and 80),
  ftm smallint not null check (ftm between 0 and 40),
  fta smallint not null check (fta between 0 and 50),
  oreb smallint not null check (oreb between 0 and 30),
  dreb smallint not null check (dreb between 0 and 40),
  stl smallint not null check (stl between 0 and 20),
  blk smallint not null check (blk between 0 and 20),
  tov smallint not null check (tov between 0 and 25),
  pf smallint not null check (pf between 0 and 6),
  plus_minus smallint check (plus_minus between -90 and 90),
  source text not null default 'stats.nba.com',
  ingested_at timestamptz not null default now(),
  primary key (game_id, player_id),
  check (fg3m <= fg3a and fgm <= fga and ftm <= fta and fg3m <= fgm and oreb + dreb = reb)
);
create index if not exists nba_player_games_player_date on public.nba_player_games (player_id, game_date desc);
create index if not exists nba_player_games_date on public.nba_player_games (game_date desc);
alter table public.nba_player_games enable row level security;
revoke all on public.nba_player_games from anon, authenticated;
