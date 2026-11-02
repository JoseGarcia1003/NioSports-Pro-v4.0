import { json } from '@sveltejs/kit';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { rotationTeammates } from '$lib/server/nba-props.js';

// Full stored history of one player (newest first) for splits and head-to-head,
// plus rotation teammates of his current team and season with the games each
// played (for "sin compañero"). The id travels as ?id= because dynamic /api/
// segments collide with the legacy root api/ folder routing on Vercel.
export async function GET({ url, request }) {
  await requireIdentity(request);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'invalid player' }, { status: 400 });
  const db = adminDatabase();
  const { data, error } = await db
    .from('nba_player_games')
    .select('game_id, game_date, opponent, is_home, minutes, pts, reb, ast, fg3m, season, team')
    .eq('player_id', id)
    .order('game_date', { ascending: false })
    .limit(250);
  if (error) return json({ error: 'stats_unavailable' }, { status: 503 });
  const rows = data || [];
  const games = rows.map(g => [g.game_date, g.opponent, g.is_home, Number(g.minutes), g.pts, g.reb, g.ast, g.fg3m, g.season, g.team, g.game_id]);

  // Teammates are optional context: a failure here never hides the history.
  let teammates = null;
  if (rows.length) {
    const scope = { team: rows[0].team, season: rows[0].season, gameIds: rows.filter(g => g.team === rows[0].team && g.season === rows[0].season).map(g => g.game_id) };
    const mates = await db
      .from('nba_player_games')
      .select('player_id, player_name, game_id, minutes')
      .eq('team', scope.team)
      .in('game_id', scope.gameIds)
      .neq('player_id', id)
      .limit(2000);
    if (!mates.error) teammates = rotationTeammates(mates.data, scope);
  }
  return json({ id, games, teammates });
}
