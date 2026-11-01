import { json } from '@sveltejs/kit';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';

// Full stored history of one player (newest first) for splits and head-to-head.
export async function GET({ params, request }) {
  await requireIdentity(request);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'invalid player' }, { status: 400 });
  const { data, error } = await adminDatabase()
    .from('nba_player_games')
    .select('game_date, opponent, is_home, minutes, pts, reb, ast, fg3m, season, team')
    .eq('player_id', id)
    .order('game_date', { ascending: false })
    .limit(250);
  if (error) return json({ error: 'stats_unavailable' }, { status: 503 });
  return json({ id, games: (data || []).map(g => [g.game_date, g.opponent, g.is_home, Number(g.minutes), g.pts, g.reb, g.ast, g.fg3m, g.season, g.team]) });
}
