import { calendarDays } from '$lib/tennis/domain.js';

// Builds today's (or tomorrow's) props board: provider schedule + ingested box scores.
const BDL = 'https://api.balldontlie.io/v1/games';
export const MIN_MINUTES_L5 = 12;

export async function scheduleFor(day, apiKey, fetchImpl = fetch) {
  const res = await fetchImpl(`${BDL}?${new URLSearchParams({ 'dates[]': day })}`, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`schedule ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.data)) throw new Error('schedule payload');
  return body.data.map(g => ({ id: g.id, datetime: g.datetime, status: g.status_state || g.status, home: g.home_team.abbreviation, visitor: g.visitor_team.abbreviation, homeName: g.home_team.full_name, visitorName: g.visitor_team.full_name }));
}

/** Keeps rotation players of the current season and attaches tonight's opponent. */
export function selectPlayers(rows, games) {
  const opponent = new Map();
  for (const g of games) { opponent.set(g.home, { opp: g.visitor, home: true, gameId: g.id }); opponent.set(g.visitor, { opp: g.home, home: false, gameId: g.id }); }
  const season = rows.reduce((max, r) => { const s = r.games?.[0]?.[8]; return s && (!max || s > max) ? s : max; }, null);
  return rows
    .filter(r => Array.isArray(r.games) && r.games.length && r.games[0][8] === season && opponent.has(r.team))
    .map(r => {
      const l5 = r.games.slice(0, 5);
      const minutes = l5.reduce((s, g) => s + Number(g[3]), 0) / l5.length;
      return { id: r.player_id, name: r.player_name, team: r.team, ...opponent.get(r.team), minutesL5: Math.round(minutes * 10) / 10, games: r.games };
    })
    .filter(p => p.minutesL5 >= MIN_MINUTES_L5)
    .sort((a, b) => b.minutesL5 - a.minutesL5);
}

export function dayFor(offset, now = Date.now()) {
  return calendarDays(now, 'America/New_York')[offset];
}

/**
 * Today's (or tomorrow's) board: schedule, rotation players with recent games and
 * what each team allows. Throws Error('schedule_unavailable' | 'stats_unavailable').
 */
export async function loadBoard(db, apiKey, offset = 0) {
  const day = dayFor(offset);
  if (!apiKey) throw new Error('schedule_unavailable');
  let games;
  try { games = await scheduleFor(day, apiKey); } catch { throw new Error('schedule_unavailable'); }
  if (!games.length) return { day, games: [], players: [], statsThrough: null, season: null, defense: null };
  const teams = [...new Set(games.flatMap(g => [g.home, g.visitor]))];
  const { data, error } = await db.rpc('nba_recent_player_games', { p_teams: teams, p_limit: 20 });
  if (error) throw new Error('stats_unavailable');
  const players = selectPlayers(data || [], games);
  const statsThrough = players.reduce((max, p) => (p.games[0][0] > max ? p.games[0][0] : max), '') || null;
  const season = players[0]?.games[0]?.[8] ?? null;
  let defense = null;
  if (season) {
    const allowed = await db.rpc('nba_team_allowed', { p_season: season });
    if (!allowed.error) defense = Object.fromEntries((allowed.data || []).map(r => [r.team, { games: r.games, pts: Number(r.pts), reb: Number(r.reb), ast: Number(r.ast), fg3m: Number(r.fg3m) }]));
  }
  return { day, games, players, statsThrough, season, defense };
}

/**
 * Rotation teammates for a player's current team and season, with the games each
 * one played. rows: box scores of other players of that team in the player's games.
 * @param {Array<{player_id:number, player_name:string, game_id:string, minutes:number|string}>} rows
 * @param {{ team: string, season: string, gameIds: string[] }} scope
 */
export function rotationTeammates(rows, scope, { limit = 8, minMinutes = 15 } = {}) {
  const total = scope.gameIds.length;
  if (!total) return [];
  const inScope = new Set(scope.gameIds);
  const byId = new Map();
  for (const r of rows || []) {
    if (!inScope.has(r.game_id)) continue;
    const m = byId.get(r.player_id) || { id: r.player_id, name: r.player_name, minutes: 0, gameIds: [] };
    m.minutes += Number(r.minutes) || 0;
    m.gameIds.push(r.game_id);
    byId.set(r.player_id, m);
  }
  return [...byId.values()]
    .map(m => ({ ...m, minutes: Math.round((m.minutes / m.gameIds.length) * 10) / 10, team: scope.team, season: scope.season, missed: total - m.gameIds.length }))
    // A regular must have played a fair share: someone who joined late would
    // otherwise look "absent" in games before he was on the roster.
    .filter(m => m.minutes >= minMinutes && m.gameIds.length >= Math.max(2, Math.ceil(total * 0.4)))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, limit);
}
