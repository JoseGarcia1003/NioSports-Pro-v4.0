// src/routes/api/cron/fetch-games/+server.js
// ════════════════════════════════════════════════════════════════
// Cron diario: obtiene partidos del día desde BallDontLie API
// y los inserta/actualiza en Supabase.
// Schedule: 0 14 * * * (10:00 AM ET = 14:00 UTC)
// ════════════════════════════════════════════════════════════════

import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { TEAM_NAME_MAP } from '$lib/engine/team-mapping.js';
import { env } from '$env/dynamic/private';

const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const BDL_API_KEY = env.BALLDONTLIE_API_KEY || '';
const CRON_SECRET = env.CRON_SECRET || '';

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function toShortName(fullName) {
  return TEAM_NAME_MAP[fullName] || null;
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ request }) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];

    // Fetch games from BallDontLie
    const headers = BDL_API_KEY ? { Authorization: BDL_API_KEY } : {};
    const res = await fetch(
      `https://api.balldontlie.io/v1/games?dates[]=${today}&per_page=15`,
      { headers, signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return json({ error: `BDL API error: ${res.status}`, details: body.slice(0, 200) }, { status: 502 });
    }

    const data = await res.json();
    const games = data.data || [];
    let inserted = 0;

    for (const game of games) {
      const homeName = toShortName(game.home_team?.full_name);
      const awayName = toShortName(game.visitor_team?.full_name);

      if (!homeName || !awayName) continue;

      // Look up team IDs
      const { data: homeTeam } = await supabase.from('teams').select('id').eq('name', homeName).single();
      const { data: awayTeam } = await supabase.from('teams').select('id').eq('name', awayName).single();

      if (!homeTeam || !awayTeam) continue;

      const gameId = `${today}-${homeName}-${awayName}`;
      const gameData = {
        id: gameId,
        date: today,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        status: game.status === 'Final' ? 'final' : (game.home_team_score > 0 ? 'live' : 'scheduled'),
        home_score: game.home_team_score || null,
        away_score: game.visitor_team_score || null,
        start_time: game.status !== 'Final' ? game.status : null,
        external_id: String(game.id),
      };

      const { error } = await supabase
        .from('games')
        .upsert(gameData, { onConflict: 'id' });

      if (error) {
        console.error(`[cron/fetch-games] Error upserting game ${gameId}:`, error.message);
      } else {
        inserted++;
      }
    }

    return json({
      success: true,
      date: today,
      gamesFromAPI: games.length,
      gamesStored: inserted,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron/fetch-games] Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
}
