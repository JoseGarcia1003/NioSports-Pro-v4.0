import { getEntitlements } from '$lib/server/entitlements.js';
import { checkRateLimit } from '$lib/services/ratelimit.js';
// src/routes/api/predict-batch/+server.js
// ════════════════════════════════════════════════════════════════
// Genera predicciones para múltiples partidos en una sola llamada.
// Usado por cron jobs y la página de picks.
// ════════════════════════════════════════════════════════════════

import { json, isHttpError } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { predict } from '$lib/engine/predictor.js';
import { MODEL_VERSION } from '$lib/engine/constants.js';
import { predictionInputError } from '$lib/server/prediction-input.js';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
  const identity = await requireIdentity(request);
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, { status: 400 }); }
    if (!body || typeof body !== 'object') return json({ error: 'Solicitud inválida.' }, { status: 400 });
    const { games, teamStats, periods = ['Q1', 'HALF', 'FULL'] } = body;

    if (!games || !Array.isArray(games) || games.length === 0) {
      return json({ error: 'games array is required' }, { status: 400 });
    }

    if (games.length > 15 || games.some(g => !g || typeof g !== 'object') || !Array.isArray(periods) || !periods.length || new Set(periods).size !== periods.length || periods.length > 3 || periods.some(p => !['FULL','HALF','Q1'].includes(p))) {
      return json({ error: 'Invalid batch size or periods' }, { status: 400 });
    }
    const { plan } = await getEntitlements(identity.uid);
    if (plan !== 'elite') return json({ error: 'Elite subscription required' }, { status: 403 });
    const quota = await checkRateLimit(identity.uid, plan, 'predictions');
    if (quota.unavailable) return json({ error: 'Quota service unavailable' }, { status: 503 });
    if (!quota.success) return json({ error: 'rate_limited' }, { status: 429 });
    const results = [];
    const abstentions = [];

    for (const game of games) {
      const homeStats = teamStats?.[game.homeTeam] || game.homeStats || {};
      const awayStats = teamStats?.[game.awayTeam] || game.awayStats || {};

      if (!homeStats || !awayStats) continue;

      const gamePredictions = {};

      for (const period of periods) {
        const line = game.lines?.[period];
        const inputError = predictionInputError({homeTeam:{name:game.homeTeam,stats:homeStats},awayTeam:{name:game.awayTeam,stats:awayStats},line,period});
        if (inputError) { abstentions.push({gameId:game.id,period,reason:inputError}); continue; }

        try {
          const prediction = predict({
            homeTeam: {
              name: game.homeTeam,
              stats: homeStats,
              restDays: game.homeRestDays ?? 2,
              injuries: game.homeInjuries || [],
            },
            awayTeam: {
              name: game.awayTeam,
              stats: awayStats,
              restDays: game.awayRestDays ?? 2,
              injuries: game.awayInjuries || [],
            },
            line,
            period,
            gameInfo: {
              arena: game.arena || null,
              date: game.date || new Date().toISOString().split('T')[0],
              context: game.context || {},
            },
          });

          gamePredictions[period] = {
            projection: prediction.projection,
            line: prediction.line,
            edge: prediction.edge,
            direction: prediction.direction,
            probability: prediction.probability,
            probabilityPercent: prediction.probabilityPercent,
            confidence: prediction.confidence,
            ev: prediction.ev,
            evPercent: prediction.evPercent,
            isValueBet: prediction.isValueBet,
            totalAdjustment: prediction.totalAdjustment,
            topFactors: prediction.topFactors,
          };
        } catch (err) {
    if (isHttpError(err)) throw err;
          console.error(`[predict-batch] Error for ${game.homeTeam} vs ${game.awayTeam} ${period}:`, err.message);
        }
      }

      if (Object.keys(gamePredictions).length > 0) {
        results.push({
          gameId: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          predictions: gamePredictions,
        });
      }
    }

    return json({
      results,
      count: results.length,
      abstentions,
      modelVersion: MODEL_VERSION.version,
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (isHttpError(err)) throw err;
    console.error('[API/predict-batch] Error:', err.message);
    return json({ error: 'Batch prediction failed', details: err.message }, { status: 500 });
  }
}
