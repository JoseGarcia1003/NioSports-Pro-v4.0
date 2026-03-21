// src/lib/services/ai-picks-generator.js
// ════════════════════════════════════════════════════════════════
// Generador automático de picks usando el Engine v2.0
// Analiza todos los partidos del día y selecciona los mejores
// ════════════════════════════════════════════════════════════════

// Motor ejecuta server-side — llamamos al API /api/predict
import { MODEL_VERSION, CONFIDENCE_THRESHOLDS, BETTING } from '$lib/engine/constants.js';

/**
 * Configuración del generador de picks IA
 */
const AI_CONFIG = {
  // Mínimo EV% para considerar un pick
  MIN_EV_PERCENT: 2.0,
  
  // Mínimo edge en puntos
  MIN_EDGE: 1.5,
  
  // Máximo picks por día (para no saturar)
  MAX_PICKS_PER_DAY: 8,
  
  // Prioridad de períodos (Q1 y HALF tienen más valor según backtesting)
  PERIOD_PRIORITY: {
    Q1: 1.2,    // 66% win rate en backtesting
    HALF: 1.1,  // 64% win rate
    FULL: 1.0,  // 53% win rate
  },
  
  // Solo incluir confianza MEDIUM o HIGH
  MIN_CONFIDENCE: 'LOW', // Cambiado porque el backtesting mostró buen rendimiento en LOW también
};

/**
 * Genera predicción para un partido llamando al API server-side
 */
async function generatePrediction(game, period, teamStats) {
  const homeTeam = game.homeTeam;
  const awayTeam = game.awayTeam;
  
  if (!teamStats[homeTeam] || !teamStats[awayTeam]) {
    return null;
  }

  let marketLine = game.lines?.[period];
  
  if (!marketLine) {
    const home = teamStats[homeTeam];
    const away = teamStats[awayTeam];
    const periodKeys = {
      Q1: { home: 'q1Home', away: 'q1Away' },
      HALF: { home: 'halfHome', away: 'halfAway' },
      FULL: { home: 'fullHome', away: 'fullAway' },
    };
    const keys = periodKeys[period];
    const homeVal = home[keys.home] || home[period.toLowerCase()] || 0;
    const awayVal = away[keys.away] || away[period.toLowerCase()] || 0;
    if (homeVal && awayVal) {
      marketLine = Math.round((homeVal + awayVal) * 2) / 2;
    } else {
      return null;
    }
  }

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeTeam: { name: homeTeam, stats: teamStats[homeTeam], restDays: 2, injuries: [] },
        awayTeam: { name: awayTeam, stats: teamStats[awayTeam], restDays: 2, injuries: [] },
        line: marketLine,
        period,
        gameInfo: { arena: homeTeam === 'Nuggets' ? 'Denver' : null },
      })
    });
    if (!res.ok) return null;
    const prediction = await res.json();

    return {
      ...prediction,
      gameId: game.id,
      homeTeam,
      awayTeam,
      homeTeamFull: game.homeTeamFull,
      awayTeamFull: game.awayTeamFull,
      period,
      marketLine,
      gameTime: game.time,
      isDemo: game.isDemo || false,
    };
  } catch (error) {
    console.error(`Error generating prediction for ${homeTeam} vs ${awayTeam}:`, error);
    return null;
  }
}

/**
 * Calcula score de valor para ordenar picks
 * Combina EV, edge, confianza y prioridad de período
 */
function calculateValueScore(pick) {
  const evScore = pick.evPercent || 0;
  const edgeScore = Math.abs(pick.edge || 0) * 2;
  const confidenceMultiplier = 
    pick.confidence === 'HIGH' ? 1.5 :
    pick.confidence === 'MEDIUM' ? 1.2 : 1.0;
  const periodMultiplier = AI_CONFIG.PERIOD_PRIORITY[pick.period] || 1.0;
  
  return (evScore + edgeScore) * confidenceMultiplier * periodMultiplier;
}

/**
 * Genera los mejores picks del día
 * @param {Array} games - Lista de partidos del día
 * @param {Object} teamStats - Estadísticas de equipos
 * @param {Object} options - Opciones adicionales
 * @returns {Array} - Lista de picks ordenados por valor
 */
export async function generateAIPicks(games, teamStats, options = {}) {
  const {
    maxPicks = AI_CONFIG.MAX_PICKS_PER_DAY,
    minEV = AI_CONFIG.MIN_EV_PERCENT,
    minEdge = AI_CONFIG.MIN_EDGE,
    periods = ['Q1', 'HALF', 'FULL'],
  } = options;

  const allPicks = [];

  // Generar predicciones para cada partido y período
  for (const game of games) {
    // Saltar juegos que ya terminaron
    if (game.isFinal) continue;

    for (const period of periods) {
      const prediction = await generatePrediction(game, period, teamStats);
      
      if (!prediction) continue;

      // Filtrar por criterios mínimos
      const absEdge = Math.abs(prediction.edge || 0);
      const evPercent = prediction.evPercent || 0;
      
      // Incluir si tiene EV positivo O edge significativo
      if (evPercent >= minEV || absEdge >= minEdge) {
        allPicks.push({
          ...prediction,
          valueScore: calculateValueScore(prediction),
          generatedAt: new Date().toISOString(),
          modelVersion: MODEL_VERSION.version,
        });
      }
    }
  }

  // Ordenar por value score (mayor primero)
  allPicks.sort((a, b) => b.valueScore - a.valueScore);

  // Limitar cantidad de picks
  const topPicks = allPicks.slice(0, maxPicks);

  // Agregar ranking
  return topPicks.map((pick, index) => ({
    ...pick,
    rank: index + 1,
    isTopPick: index === 0,
    isFeatured: index < 3,
  }));
}

/**
 * Agrupa picks por partido
 */
export function groupPicksByGame(picks) {
  const grouped = {};
  
  for (const pick of picks) {
    const key = `${pick.homeTeam}-${pick.awayTeam}`;
    if (!grouped[key]) {
      grouped[key] = {
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        homeTeamFull: pick.homeTeamFull,
        awayTeamFull: pick.awayTeamFull,
        gameTime: pick.gameTime,
        picks: [],
      };
    }
    grouped[key].picks.push(pick);
  }
  
  return Object.values(grouped);
}

/**
 * Obtiene resumen de picks del día
 */
export function getPicksSummary(picks) {
  if (!picks || picks.length === 0) {
    return {
      total: 0,
      byPeriod: {},
      byDirection: {},
      byConfidence: {},
      avgEV: 0,
      avgEdge: 0,
    };
  }

  const byPeriod = { Q1: 0, HALF: 0, FULL: 0 };
  const byDirection = { OVER: 0, UNDER: 0 };
  const byConfidence = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let totalEV = 0;
  let totalEdge = 0;

  for (const pick of picks) {
    byPeriod[pick.period] = (byPeriod[pick.period] || 0) + 1;
    byDirection[pick.direction] = (byDirection[pick.direction] || 0) + 1;
    byConfidence[pick.confidence] = (byConfidence[pick.confidence] || 0) + 1;
    totalEV += pick.evPercent || 0;
    totalEdge += Math.abs(pick.edge || 0);
  }

  return {
    total: picks.length,
    byPeriod,
    byDirection,
    byConfidence,
    avgEV: Math.round(totalEV / picks.length * 10) / 10,
    avgEdge: Math.round(totalEdge / picks.length * 10) / 10,
  };
}