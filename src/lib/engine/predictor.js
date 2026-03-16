/**
 * @fileoverview Motor predictivo principal de NioSports Pro
 * Integra proyección base, ajustes contextuales y análisis de probabilidad
 */

import { RECENCY_WEIGHTS, CALIBRATION, STD_DEV, MODEL_VERSION } from './constants.js';
import { analyzePlay, calculateOverProbability } from './probability.js';
import { calculateAllAdjustments, formatFactorsForDisplay } from './factors.js';

// ═══════════════════════════════════════════════════════════════
// PROYECCIÓN BASE
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula promedio ponderado por recencia
 * @param {Object} stats - Stats del equipo
 * @param {number} stats.last5 - Promedio últimos 5 juegos
 * @param {number} stats.last10 - Promedio últimos 10 juegos
 * @param {number} stats.season - Promedio de temporada
 * @returns {number} Promedio ponderado
 */
export function calculateWeightedAverage(stats) {
  const { last5 = 0, last10 = 0, season = 0 } = stats;

  // Si no hay datos recientes, usar temporada
  if (!last5 && !last10) return season;
  if (!last5) return last10 * 0.6 + season * 0.4;

  return (
    last5 * RECENCY_WEIGHTS.LAST_5 +
    last10 * RECENCY_WEIGHTS.LAST_10 +
    season * RECENCY_WEIGHTS.SEASON
  );
}

/**
 * Calcula proyección base para un período
 * @param {Object} homeStats - Stats del equipo local
 * @param {Object} awayStats - Stats del equipo visitante
 * @param {string} period - Período ('Q1', 'HALF', 'FULL', etc.)
 * @returns {number} Proyección base en puntos
 */
export function calculateBaseProjection(homeStats, awayStats, period = 'FULL') {
  const periodKey = period.toLowerCase();

  // Obtener stats ofensivas de cada equipo para el período
  const homeOffense = {
    last5: homeStats[`${periodKey}Last5`] || homeStats[`${periodKey}`] || 0,
    last10: homeStats[`${periodKey}Last10`] || homeStats[`${periodKey}`] || 0,
    season: homeStats[`${periodKey}Season`] || homeStats[`${periodKey}`] || 0
  };

  const awayOffense = {
    last5: awayStats[`${periodKey}Last5`] || awayStats[`${periodKey}`] || 0,
    last10: awayStats[`${periodKey}Last10`] || awayStats[`${periodKey}`] || 0,
    season: awayStats[`${periodKey}Season`] || awayStats[`${periodKey}`] || 0
  };

  // Si hay datos en formato simple (ej: q1Home, q1Away)
  if (!homeOffense.season && homeStats[`${periodKey}Home`]) {
    homeOffense.last5 = homeStats[`${periodKey}Home`];
    homeOffense.last10 = homeStats[`${periodKey}Home`];
    homeOffense.season = homeStats[`${periodKey}Home`];
  }

  if (!awayOffense.season && awayStats[`${periodKey}Away`]) {
    awayOffense.last5 = awayStats[`${periodKey}Away`];
    awayOffense.last10 = awayStats[`${periodKey}Away`];
    awayOffense.season = awayStats[`${periodKey}Away`];
  }

  const homeWeighted = calculateWeightedAverage(homeOffense);
  const awayWeighted = calculateWeightedAverage(awayOffense);

  return homeWeighted + awayWeighted;
}

// ═══════════════════════════════════════════════════════════════
// CALIBRACIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Aplica corrección de sesgo de sobreestimación
 * @param {number} projection - Proyección sin calibrar
 * @param {string} period - Período
 * @returns {number} Proyección corregida
 */
export function applyBiasCorrection(projection, period = 'FULL') {
  const bias = CALIBRATION.OVERESTIMATION_BIAS[period] || 0;
  return projection - bias;
}

/**
 * Aplica shrinkage a proyecciones extremas
 * @param {number} projection - Proyección
 * @param {number} leagueMean - Media de la liga para el período
 * @returns {number} Proyección con shrinkage aplicado
 */
export function applyShrinkage(projection, leagueMean) {
  const deviation = Math.abs(projection - leagueMean);

  if (deviation > CALIBRATION.SHRINKAGE_THRESHOLD) {
    const shrinkageAmount = (deviation - CALIBRATION.SHRINKAGE_THRESHOLD) * CALIBRATION.SHRINKAGE_FACTOR;
    const direction = projection > leagueMean ? -1 : 1;
    return projection + (shrinkageAmount * direction);
  }

  return projection;
}

/**
 * Aplica todas las calibraciones
 * @param {number} projection - Proyección base
 * @param {string} period - Período
 * @param {number} leagueMean - Media de la liga (opcional)
 * @returns {number} Proyección calibrada
 */
export function calibrateProjection(projection, period = 'FULL', leagueMean = null) {
  let calibrated = applyBiasCorrection(projection, period);

  // Medias aproximadas de la liga por período
  const defaultMeans = {
    Q1: 56,
    Q2: 56,
    Q3: 55,
    Q4: 57,
    HALF: 112,
    FULL: 224
  };

  const mean = leagueMean || defaultMeans[period] || 224;
  calibrated = applyShrinkage(calibrated, mean);

  return Math.round(calibrated * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════
// MOTOR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

/**
 * Genera predicción completa para un partido
 * @param {Object} params
 * @param {Object} params.homeTeam - Datos del equipo local
 * @param {Object} params.awayTeam - Datos del equipo visitante
 * @param {number} params.line - Línea de apuesta
 * @param {string} params.period - Período
 * @param {Object} params.gameInfo - Info adicional del partido
 * @returns {Object} Predicción completa con análisis
 */
export function predict({
  homeTeam,
  awayTeam,
  line,
  period = 'FULL',
  gameInfo = {}
}) {
  // 1. Calcular proyección base
  const baseProjection = calculateBaseProjection(
    homeTeam.stats || homeTeam,
    awayTeam.stats || awayTeam,
    period
  );

  // 2. Calcular ajustes contextuales
  const adjustments = calculateAllAdjustments({
    homeTeam,
    awayTeam,
    gameInfo
  });

  // 3. Aplicar ajustes
  const adjustedProjection = baseProjection + adjustments.totalAdjustment;

  // 4. Calibrar
  const finalProjection = calibrateProjection(adjustedProjection, period);

  // 5. Analizar probabilidades
  const analysis = analyzePlay(finalProjection, line, period);

  // 6. Construir respuesta
  return {
    // Proyección
    projection: finalProjection,
    baseProjection: Math.round(baseProjection * 10) / 10,
    adjustedProjection: Math.round(adjustedProjection * 10) / 10,

    // Línea y edge
    line,
    edge: analysis.edge,
    period,

    // Recomendación
    direction: analysis.direction,
    probability: analysis.probability,
    probabilityPercent: analysis.probabilityPercent,
    confidence: analysis.confidence,

    // Expected Value
    ev: analysis.ev,
    evPercent: analysis.evPercent,
    isValueBet: analysis.isValueBet,

    // Factores
    adjustments: adjustments.factors,
    totalAdjustment: adjustments.totalAdjustment,
    topFactors: adjustments.topFactors,
    factorsDisplay: formatFactorsForDisplay(adjustments.topFactors),

    // Estadísticas
    zScore: analysis.zScore,
    stdDev: analysis.stdDev,

    // Metadata
    modelVersion: MODEL_VERSION.version,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Genera predicciones para múltiples períodos
 * @param {Object} params - Mismos params que predict()
 * @param {Array<string>} periods - Períodos a calcular
 * @returns {Object} Predicciones por período
 */
export function predictAllPeriods({
  homeTeam,
  awayTeam,
  lines = {},
  gameInfo = {}
}) {
  const periods = ['Q1', 'HALF', 'FULL'];
  const predictions = {};

  for (const period of periods) {
    const line = lines[period];
    if (line !== undefined && line !== null) {
      predictions[period] = predict({
        homeTeam,
        awayTeam,
        line,
        period,
        gameInfo
      });
    }
  }

  return predictions;
}

/**
 * Versión simplificada para uso rápido
 * @param {number} homePoints - Puntos esperados equipo local
 * @param {number} awayPoints - Puntos esperados equipo visitante
 * @param {number} line - Línea de apuesta
 * @param {string} period - Período
 * @returns {Object} Predicción básica
 */
export function quickPredict(homePoints, awayPoints, line, period = 'FULL') {
  const projection = homePoints + awayPoints;
  return analyzePlay(projection, line, period);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS ADICIONALES
// ═══════════════════════════════════════════════════════════════

export { MODEL_VERSION };