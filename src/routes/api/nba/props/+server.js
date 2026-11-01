import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { scheduleFor, selectPlayers, dayFor } from '$lib/server/nba-props.js';

export async function GET({ url }) {
  const offset = url.searchParams.get('day') === '1' ? 1 : 0;
  const day = dayFor(offset);
  if (!env.BALLDONTLIE_API_KEY) return json({ error: 'schedule_unavailable' }, { status: 503 });
  let games;
  try { games = await scheduleFor(day, env.BALLDONTLIE_API_KEY); } catch { return json({ error: 'schedule_unavailable' }, { status: 503 }); }
  if (!games.length) return json({ day, games: [], players: [], statsThrough: null });

  const teams = [...new Set(games.flatMap(g => [g.home, g.visitor]))];
  const db = adminDatabase();
  const { data, error } = await db.rpc('nba_recent_player_games', { p_teams: teams, p_limit: 20 });
  if (error) return json({ error: 'stats_unavailable' }, { status: 503 });
  const players = selectPlayers(data || [], games);
  const statsThrough = players.reduce((max, p) => (p.games[0][0] > max ? p.games[0][0] : max), '');
  return json({ day, games, players, statsThrough: statsThrough || null, sources: { schedule: 'balldontlie', stats: 'stats.nba.com' } });
}
