// src/routes/api/predict-batch/+server.js
// ════════════════════════════════════════════════════════════════
// Genera predicciones para múltiples partidos en una sola llamada.
// Usado por cron jobs y la página de picks.
// ════════════════════════════════════════════════════════════════

import { json } from '@sveltejs/kit';
import { predict } from '$lib/engine/predictor.js';
import { MODEL_VERSION } from '$lib/engine/constants.js';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
  try {
    const { games, teamStats, periods = ['Q1', 'HALF', 'FULL'] } = await request.json();

    if (!games || !Array.isArray(games) || games.length === 0) {
      return json({ error: 'games array is required' }, { status: 400 });
    }

    const results = [];

    for (const game of games) {
      const homeStats = teamStats?.[game.homeTeam] || game.homeStats || {};
      const awayStats = teamStats?.[game.awayTeam] || game.awayStats || {};

      if (!homeStats || !awayStats) continue;

      const gamePredictions = {};

      for (const period of periods) {
        const line = game.lines?.[period];
        if (line === undefined || line === null) continue;

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
      modelVersion: MODEL_VERSION.version,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[API/predict-batch] Error:', err.message);
    return json({ error: 'Batch prediction failed', details: err.message }, { status: 500 });
  }
}
