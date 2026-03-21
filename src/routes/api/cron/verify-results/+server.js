// src/routes/api/cron/verify-results/+server.js
// ════════════════════════════════════════════════════════════════
// Cron: verifica resultados de partidos finalizados,
// resuelve predicciones y picks pendientes automáticamente.
// Schedule: 0 2,3,4,5 * * * (10PM-1AM ET = 2-5 UTC)
// ════════════════════════════════════════════════════════════════

import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const BDL_API_KEY = env.BALLDONTLIE_API_KEY || '';
const CRON_SECRET = env.CRON_SECRET || '';

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ request }) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 1. Find games that might have finished (today and yesterday)
    const { data: pendingGames } = await supabase
      .from('games')
      .select('*')
      .in('date', [today, yesterday])
      .neq('status', 'final')
      .not('external_id', 'is', null);

    if (!pendingGames || pendingGames.length === 0) {
      return json({ success: true, message: 'No pending games to verify', resolved: 0 });
    }

    let gamesResolved = 0;
    let predictionsResolved = 0;
    let picksResolved = 0;

    for (const game of pendingGames) {
      // Fetch latest score from BallDontLie
      const headers = BDL_API_KEY ? { Authorization: BDL_API_KEY } : {};
      const res = await fetch(
        `https://api.balldontlie.io/v1/games/${game.external_id}`,
        { headers, signal: AbortSignal.timeout(8000) }
      );

      if (!res.ok) continue;
      const bdlGame = await res.json();

      if (bdlGame.status !== 'Final') continue;

      // Update game with final scores
      const { error: gameError } = await supabase
        .from('games')
        .update({
          status: 'final',
          home_score: bdlGame.home_team_score,
          away_score: bdlGame.visitor_team_score,
        })
        .eq('id', game.id);

      if (gameError) {
        console.error(`[verify-results] Error updating game ${game.id}:`, gameError.message);
        continue;
      }

      gamesResolved++;
      const fullTotal = bdlGame.home_team_score + bdlGame.visitor_team_score;

      // 2. Resolve predictions for this game
      const { data: predictions } = await supabase
        .from('predictions')
        .select('*')
        .eq('game_id', game.id)
        .is('result', null);

      if (predictions) {
        for (const pred of predictions) {
          if (pred.period !== 'FULL') continue;

          const actualTotal = fullTotal;
          const won = pred.direction === 'OVER'
            ? actualTotal > pred.line
            : actualTotal < pred.line;
          const isPush = actualTotal === pred.line;

          const result = isPush ? 'push' : (won ? 'win' : 'loss');
          const modelError = pred.projection - actualTotal;

          const { error: predError } = await supabase
            .from('predictions')
            .update({
              result,
              actual_total: actualTotal,
              model_error: Math.round(modelError * 10) / 10,
            })
            .eq('id', pred.id);

          if (!predError) predictionsResolved++;
        }
      }

      // 3. Resolve user picks for this game (FULL period)
      const { data: picks } = await supabase
        .from('picks')
        .select('*')
        .eq('game_id', game.id)
        .eq('status', 'pending')
        .eq('period', 'FULL');

      if (picks) {
        for (const pick of picks) {
          const actualTotal = fullTotal;
          const won = pick.bet_type === 'OVER'
            ? actualTotal > pick.line
            : actualTotal < pick.line;
          const isPush = actualTotal === pick.line;

          const result = isPush ? 'push' : (won ? 'win' : 'loss');
          const modelError = pick.projection ? pick.projection - actualTotal : null;

          let clv = null;
          if (pick.closing_line != null) {
            clv = pick.bet_type === 'OVER'
              ? pick.closing_line - pick.line
              : pick.line - pick.closing_line;
          }

          const { error: pickError } = await supabase
            .from('picks')
            .update({
              status: result,
              actual_total: actualTotal,
              model_error: modelError ? Math.round(modelError * 10) / 10 : null,
              clv: clv ? Math.round(clv * 10) / 10 : null,
              resolved_at: new Date().toISOString(),
            })
            .eq('id', pick.id);

          if (!pickError) picksResolved++;
        }
      }
    }

    return json({
      success: true,
      gamesChecked: pendingGames.length,
      gamesResolved,
      predictionsResolved,
      picksResolved,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron/verify-results] Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
}
