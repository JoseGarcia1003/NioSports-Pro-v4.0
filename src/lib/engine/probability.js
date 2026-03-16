/**
 * @fileoverview Funciones de probabilidad para el motor predictivo
 * Implementa distribución normal para cálculo de probabilidades reales
 */

import { STD_DEV, BETTING, CONFIDENCE_THRESHOLDS } from './constants.js';

// ═══════════════════════════════════════════════════════════════
// DISTRIBUCIÓN NORMAL
// ═══════════════════════════════════════════════════════════════

/**
 * Función de distribución acumulada (CDF) de la distribución normal estándar
 * Aproximación de Abramowitz and Stegun (error < 1.5×10⁻⁷)
 * @param {number} z - Z-score
 * @returns {number} Probabilidad acumulada (0-1)
 */
export function normalCDF(z) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calcula el z-score dado un valor, media y desviación estándar
 * @param {number} value - Valor observado (línea de apuesta)
 * @param {number} mean - Media (proyección del modelo)
 * @param {number} stdDev - Desviación estándar
 * @returns {number} Z-score
 */
export function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (mean - value) / stdDev;
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO DE PROBABILIDADES
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula la probabilidad de OVER dado proyección y línea
 * @param {number} projection - Proyección del modelo (puntos totales)
 * @param {number} line - Línea de apuesta
 * @param {string} period - Período ('Q1', 'Q2', 'Q3', 'Q4', 'HALF', 'FULL')
 * @returns {number} Probabilidad de OVER (0-1)
 */
export function calculateOverProbability(projection, line, period = 'FULL') {
  const stdDev = STD_DEV[period] || STD_DEV.FULL;
  const zScore = calculateZScore(line, projection, stdDev);
  return normalCDF(zScore);
}

/**
 * Calcula la probabilidad de UNDER dado proyección y línea
 * @param {number} projection - Proyección del modelo
 * @param {number} line - Línea de apuesta
 * @param {string} period - Período
 * @returns {number} Probabilidad de UNDER (0-1)
 */
export function calculateUnderProbability(projection, line, period = 'FULL') {
  return 1 - calculateOverProbability(projection, line, period);
}

/**
 * Determina la dirección recomendada (OVER/UNDER) y su probabilidad
 * @param {number} projection - Proyección del modelo
 * @param {number} line - Línea de apuesta
 * @param {string} period - Período
 * @returns {{direction: string, probability: number, confidence: string}}
 */
export function getRecommendation(projection, line, period = 'FULL') {
  const overProb = calculateOverProbability(projection, line, period);
  const underProb = 1 - overProb;

  const isOver = overProb >= underProb;
  const probability = isOver ? overProb : underProb;
  const probabilityPercent = probability * 100;

  let confidence;
  if (probabilityPercent >= CONFIDENCE_THRESHOLDS.HIGH) {
    confidence = 'HIGH';
  } else if (probabilityPercent >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  return {
    direction: isOver ? 'OVER' : 'UNDER',
    probability,
    probabilityPercent: Math.round(probabilityPercent * 10) / 10,
    confidence
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPECTED VALUE
// ═══════════════════════════════════════════════════════════════

/**
 * Convierte odds americanos a probabilidad implícita
 * @param {number} americanOdds - Odds americanos (ej: -110, +150)
 * @returns {number} Probabilidad implícita (0-1)
 */
export function oddsToImpliedProbability(americanOdds) {
  if (americanOdds < 0) {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
  return 100 / (americanOdds + 100);
}

/**
 * Convierte odds americanos a decimal
 * @param {number} americanOdds - Odds americanos
 * @returns {number} Odds decimales
 */
export function oddsToDecimal(americanOdds) {
  if (americanOdds < 0) {
    return 1 + (100 / Math.abs(americanOdds));
  }
  return 1 + (americanOdds / 100);
}

/**
 * Calcula el Expected Value de una apuesta
 * @param {number} winProbability - Probabilidad de ganar (0-1)
 * @param {number} americanOdds - Odds americanos (default -110)
 * @returns {{ev: number, evPercent: number, isPositive: boolean}}
 */
export function calculateEV(winProbability, americanOdds = BETTING.STANDARD_JUICE) {
  const decimalOdds = oddsToDecimal(americanOdds);
  const lossProbability = 1 - winProbability;

  // EV = (probabilidad de ganar × ganancia) - (probabilidad de perder × pérdida)
  // Con $100 de apuesta:
  const potentialWin = (decimalOdds - 1) * 100;
  const potentialLoss = 100;

  const ev = (winProbability * potentialWin) - (lossProbability * potentialLoss);
  const evPercent = ev / 100; // Como porcentaje del stake

  return {
    ev: Math.round(ev * 100) / 100,
    evPercent: Math.round(evPercent * 1000) / 10, // 1 decimal
    isPositive: ev > 0,
    meetsThreshold: evPercent >= BETTING.MIN_EV_THRESHOLD * 100
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula el edge sobre la línea (diferencia proyección vs línea)
 * @param {number} projection - Proyección del modelo
 * @param {number} line - Línea de apuesta
 * @returns {number} Edge en puntos (positivo = OVER, negativo = UNDER)
 */
export function calculateEdge(projection, line) {
  return Math.round((projection - line) * 10) / 10;
}

/**
 * Retorna análisis completo de probabilidad para un pick
 * @param {number} projection - Proyección del modelo
 * @param {number} line - Línea de apuesta
 * @param {string} period - Período
 * @param {number} odds - Odds americanos
 * @returns {Object} Análisis completo
 */
export function analyzePlay(projection, line, period = 'FULL', odds = BETTING.STANDARD_JUICE) {
  const recommendation = getRecommendation(projection, line, period);
  const ev = calculateEV(recommendation.probability, odds);
  const edge = calculateEdge(projection, line);
  const stdDev = STD_DEV[period] || STD_DEV.FULL;
  const zScore = calculateZScore(line, projection, stdDev);

  return {
    projection: Math.round(projection * 10) / 10,
    line,
    period,
    edge,
    zScore: Math.round(zScore * 100) / 100,
    ...recommendation,
    ev: ev.ev,
    evPercent: ev.evPercent,
    isValueBet: ev.meetsThreshold,
    stdDev
  };
}