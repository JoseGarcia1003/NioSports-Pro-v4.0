import { playerRow, teamRows, standings, seasonFor, previousSeason } from '$lib/nba/season.js';

// Season statistics for the leaders tables and the standings, cached per
// server instance for 10 minutes (the data changes once a day with ingestion).
const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

export function allowedSeasons(now = Date.now()) {
  const current = seasonFor(now);
  return [current, previousSeason(current)];
}

export async function loadSeason(db, season, { now = Date.now(), useCache = true } = {}) {
  const hit = cache.get(season);
  if (useCache && hit && now - hit.at < TTL_MS) return hit.value;
  const [players, games] = await Promise.all([
    db.rpc('nba_player_season', { p_season: season, p_season_type: 'Regular Season' }),
    db.rpc('nba_team_season_games', { p_season: season, p_season_type: 'Regular Season' })
  ]);
  if (players.error || games.error) throw new Error('stats_unavailable');
  const teamGames = games.data || [];
  const through = teamGames.reduce((max, g) => (String(g.game_date) > max ? String(g.game_date) : max), '') || null;
  const value = {
    season, seasonType: 'Regular Season', through, source: 'stats.nba.com',
    players: (players.data || []).map(playerRow),
    teams: teamRows(teamGames),
    standings: standings(teamGames)
  };
  cache.set(season, { at: now, value });
  return value;
}

export function clearSeasonCache() { cache.clear(); }
