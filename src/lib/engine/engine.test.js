/**
 * @fileoverview Tests del motor predictivo NioSports Pro
 * Ejecutar con: npm run test
 */

import { describe, it, expect } from 'vitest';

// Imports del engine
import {
  normalCDF,
  calculateZScore,
  calculateOverProbability,
  calculateUnderProbability,
  calculateEV,
  getRecommendation,
  analyzePlay,
  oddsToDecimal,
  oddsToImpliedProbability
} from './probability.js';

import {
  calculateRestAdjustment,
  calculateInjuryAdjustment,
  calculateAltitudeAdjustment,
  calculateAllAdjustments,
  formatFactorsForDisplay
} from './factors.js';

import {
  predict,
  quickPredict,
  calculateWeightedAverage,
  calculateBaseProjection,
  calibrateProjection
} from './predictor.js';

import {
  STD_DEV,
  ADJUSTMENTS,
  RECENCY_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  BETTING
} from './constants.js';

// ═══════════════════════════════════════════════════════════════
// TESTS DE CONSTANTES
// ═══════════════════════════════════════════════════════════════

describe('Constants', () => {
  it('STD_DEV tiene todos los períodos', () => {
    expect(STD_DEV.Q1).toBeDefined();
    expect(STD_DEV.HALF).toBeDefined();
    expect(STD_DEV.FULL).toBeDefined();
  });

  it('STD_DEV tiene valores positivos', () => {
    Object.values(STD_DEV).forEach(value => {
      expect(value).toBeGreaterThan(0);
    });
  });

  it('STD_DEV escala correctamente (Q1 < HALF < FULL)', () => {
    expect(STD_DEV.Q1).toBeLessThan(STD_DEV.HALF);
    expect(STD_DEV.HALF).toBeLessThan(STD_DEV.FULL);
  });

  it('RECENCY_WEIGHTS suman 1', () => {
    const sum = RECENCY_WEIGHTS.LAST_5 + RECENCY_WEIGHTS.LAST_10 + RECENCY_WEIGHTS.SEASON;
    expect(sum).toBeCloseTo(1, 5);
  });

  it('ADJUSTMENTS tienen estructura correcta', () => {
    expect(ADJUSTMENTS.B2B.value).toBeDefined();
    expect(ADJUSTMENTS.B2B.range).toHaveLength(2);
    expect(ADJUSTMENTS.B2B.description).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// TESTS DE PROBABILIDAD
// ═══════════════════════════════════════════════════════════════

describe('Probability Functions', () => {
  describe('normalCDF', () => {
    it('retorna 0.5 para z=0', () => {
      expect(normalCDF(0)).toBeCloseTo(0.5, 4);
    });

    it('retorna ~0.8413 para z=1', () => {
      expect(normalCDF(1)).toBeCloseTo(0.8413, 3);
    });

    it('retorna ~0.1587 para z=-1', () => {
      expect(normalCDF(-1)).toBeCloseTo(0.1587, 3);
    });

    it('retorna ~0.9772 para z=2', () => {
      expect(normalCDF(2)).toBeCloseTo(0.9772, 3);
    });

    it('está entre 0 y 1 para cualquier z', () => {
      [-5, -2, -1, 0, 1, 2, 5].forEach(z => {
        const result = normalCDF(z);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      });
    });

    it('es monotónicamente creciente', () => {
      const values = [-3, -2, -1, 0, 1, 2, 3].map(normalCDF);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe('calculateZScore', () => {
    it('retorna 0 cuando value = mean', () => {
      expect(calculateZScore(220, 220, 10)).toBe(0);
    });

    it('retorna 1 cuando value está 1 stdDev abajo de mean', () => {
      expect(calculateZScore(210, 220, 10)).toBeCloseTo(1, 5);
    });

    it('retorna -1 cuando value está 1 stdDev arriba de mean', () => {
      expect(calculateZScore(230, 220, 10)).toBeCloseTo(-1, 5);
    });

    it('maneja stdDev = 0', () => {
      expect(calculateZScore(220, 225, 0)).toBe(0);
    });
  });

  describe('calculateOverProbability quarantine', () => {
    it('rejects legacy inference instead of inventing probabilities', () => {
      expect(() => calculateOverProbability(220,220)).toThrow('LEGACY_PROBABILITY_DISABLED');
    });
  });

  describe('calculateUnderProbability quarantine', () => {
    it('rejects legacy inference instead of inventing probabilities', () => {
      expect(() => calculateUnderProbability(220,220)).toThrow('LEGACY_PROBABILITY_DISABLED');
    });
  });

  describe('getRecommendation quarantine', () => {
    it('rejects legacy inference instead of inventing probabilities', () => {
      expect(() => getRecommendation(220,220)).toThrow('LEGACY_PROBABILITY_DISABLED');
    });
  });

  describe('oddsToDecimal', () => {
    it('convierte -110 a 1.909', () => {
      expect(oddsToDecimal(-110)).toBeCloseTo(1.909, 2);
    });

    it('convierte +150 a 2.5', () => {
      expect(oddsToDecimal(150)).toBeCloseTo(2.5, 2);
    });

    it('convierte -200 a 1.5', () => {
      expect(oddsToDecimal(-200)).toBeCloseTo(1.5, 2);
    });

    it('convierte +100 a 2.0', () => {
      expect(oddsToDecimal(100)).toBeCloseTo(2.0, 2);
    });
  });

  describe('oddsToImpliedProbability', () => {
    it('convierte -110 a ~52.4%', () => {
      expect(oddsToImpliedProbability(-110)).toBeCloseTo(0.524, 2);
    });

    it('convierte +100 a 50%', () => {
      expect(oddsToImpliedProbability(100)).toBeCloseTo(0.5, 2);
    });

    it('convierte -200 a ~66.7%', () => {
      expect(oddsToImpliedProbability(-200)).toBeCloseTo(0.667, 2);
    });
  });

  describe('calculateEV', () => {
    it('retorna EV positivo cuando prob > implied', () => {
      const ev = calculateEV(0.60, -110);
      expect(ev.ev).toBeGreaterThan(0);
      expect(ev.isPositive).toBe(true);
    });

    it('retorna EV negativo cuando prob < implied', () => {
      const ev = calculateEV(0.45, -110);
      expect(ev.ev).toBeLessThan(0);
      expect(ev.isPositive).toBe(false);
    });

    it('retorna EV ~0 cuando prob = implied', () => {
      const ev = calculateEV(0.524, -110);
      expect(Math.abs(ev.ev)).toBeLessThan(1);
    });

    it('meetsThreshold es true para EV >= 2%', () => {
      const ev = calculateEV(0.58, -110);
      expect(ev.meetsThreshold).toBe(true);
    });
  });

  describe('analyzePlay quarantine', () => {
    it('rejects legacy inference instead of inventing probabilities', () => {
      expect(() => analyzePlay(220,220)).toThrow('LEGACY_PROBABILITY_DISABLED');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// TESTS DE FACTORES
// ═══════════════════════════════════════════════════════════════

describe('Factors', () => {
  describe('calculateRestAdjustment', () => {
    it('retorna B2B adjustment para 0 días de descanso', () => {
      const adj = calculateRestAdjustment(0, true);
      expect(adj).not.toBeNull();
      expect(adj.factor).toBe('B2B');
      expect(adj.adjustment).toBe(ADJUSTMENTS.B2B.value);
    });

    it('retorna B2B_ROAD para visitante en B2B', () => {
      const adj = calculateRestAdjustment(0, false);
      expect(adj.adjustment).toBe(ADJUSTMENTS.B2B_ROAD.value);
    });

    it('retorna 4+ rest adjustment para 4+ días', () => {
      const adj = calculateRestAdjustment(5, true);
      expect(adj).not.toBeNull();
      expect(adj.factor).toBe('REST_4+');
      expect(adj.adjustment).toBeGreaterThan(0);
    });

    it('retorna null para descanso normal (1-3 días)', () => {
      expect(calculateRestAdjustment(1, true)).toBeNull();
      expect(calculateRestAdjustment(2, true)).toBeNull();
      expect(calculateRestAdjustment(3, true)).toBeNull();
    });
  });

  describe('calculateInjuryAdjustment', () => {
    it('retorna null para array vacío', () => {
      expect(calculateInjuryAdjustment([])).toBeNull();
    });

    it('calcula ajuste para estrella', () => {
      const adj = calculateInjuryAdjustment([{ name: 'LeBron', type: 'star' }]);
      expect(adj.adjustment).toBe(ADJUSTMENTS.STAR_OUT.value);
    });

    it('acumula ajustes de múltiples lesiones', () => {
      const injuries = [
        { name: 'Player1', type: 'star' },
        { name: 'Player2', type: 'starter' }
      ];
      const adj = calculateInjuryAdjustment(injuries);
      expect(adj.adjustment).toBe(ADJUSTMENTS.STAR_OUT.value + ADJUSTMENTS.STARTER_OUT.value);
    });
  });

  describe('calculateAltitudeAdjustment', () => {
    it('retorna ajuste positivo para Denver home', () => {
      const adj = calculateAltitudeAdjustment('Denver', true);
      expect(adj).not.toBeNull();
      expect(adj.adjustment).toBeGreaterThan(0);
    });

    it('retorna ajuste negativo para Denver visitor', () => {
      const adj = calculateAltitudeAdjustment('Denver', false);
      expect(adj).not.toBeNull();
      expect(adj.adjustment).toBeLessThan(0);
    });

    it('retorna null para otras arenas', () => {
      expect(calculateAltitudeAdjustment('Los Angeles', true)).toBeNull();
      expect(calculateAltitudeAdjustment('Miami', false)).toBeNull();
    });
  });

  describe('calculateAllAdjustments', () => {
    it('retorna objeto con totalAdjustment', () => {
      const result = calculateAllAdjustments({
        homeTeam: { restDays: 0 },
        awayTeam: { restDays: 2 },
        gameInfo: {}
      });

      expect(result.totalAdjustment).toBeDefined();
      expect(result.factors).toBeInstanceOf(Array);
      expect(result.factorCount).toBeDefined();
    });

    it('acumula múltiples factores', () => {
      const result = calculateAllAdjustments({
        homeTeam: { restDays: 0, injuries: [{ name: 'Star', type: 'star' }] },
        awayTeam: { restDays: 2 },
        gameInfo: { arena: 'Denver' }
      });

      expect(result.factors.length).toBeGreaterThan(1);
    });

    it('ordena factores por impacto', () => {
      const result = calculateAllAdjustments({
        homeTeam: { restDays: 0, injuries: [{ name: 'Star', type: 'star' }] },
        awayTeam: {},
        gameInfo: {}
      });

      for (let i = 1; i < result.factors.length; i++) {
        expect(Math.abs(result.factors[i].adjustment))
          .toBeLessThanOrEqual(Math.abs(result.factors[i - 1].adjustment));
      }
    });
  });

  describe('formatFactorsForDisplay', () => {
    it('retorna string para factores vacíos', () => {
      expect(formatFactorsForDisplay([])).toBe('Sin ajustes contextuales');
    });

    it('formatea factores correctamente', () => {
      const factors = [{ description: 'B2B', adjustment: -2.8 }];
      const result = formatFactorsForDisplay(factors);
      expect(result).toContain('B2B');
      expect(result).toContain('-2.8');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// TESTS DE PREDICTOR
// ═══════════════════════════════════════════════════════════════

describe('Predictor', () => {
  describe('calculateWeightedAverage', () => {
    it('aplica pesos correctamente', () => {
      const stats = { last5: 100, last10: 90, season: 80 };
      const result = calculateWeightedAverage(stats);
      
      const expected = 100 * 0.45 + 90 * 0.30 + 80 * 0.25;
      expect(result).toBeCloseTo(expected, 5);
    });

    it('usa season si no hay datos recientes', () => {
      const stats = { season: 100 };
      expect(calculateWeightedAverage(stats)).toBe(100);
    });

    it('maneja datos parciales', () => {
      const stats = { last10: 95, season: 90 };
      const result = calculateWeightedAverage(stats);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateBaseProjection', () => {
    it('suma stats de ambos equipos', () => {
      const homeStats = { fullHome: 110 };
      const awayStats = { fullAway: 108 };
      
      const projection = calculateBaseProjection(homeStats, awayStats, 'FULL');
      expect(projection).toBeCloseTo(218, 0);
    });

    it('funciona para diferentes períodos', () => {
      const homeStats = { q1Home: 28, halfHome: 55, fullHome: 110 };
      const awayStats = { q1Away: 27, halfAway: 54, fullAway: 108 };
      
      const q1 = calculateBaseProjection(homeStats, awayStats, 'Q1');
      const half = calculateBaseProjection(homeStats, awayStats, 'HALF');
      const full = calculateBaseProjection(homeStats, awayStats, 'FULL');
      
      expect(q1).toBeLessThan(half);
      expect(half).toBeLessThan(full);
    });
  });

  describe('calibrateProjection', () => {
    it('aplica bias correction', () => {
      const raw = 230;
      const calibrated = calibrateProjection(raw, 'FULL');
      expect(calibrated).not.toBe(raw);
    });

    it('aplica shrinkage a valores extremos', () => {
      const extreme = 260;
      const calibrated = calibrateProjection(extreme, 'FULL');
      expect(calibrated).toBeLessThan(extreme);
    });

    it('retorna número redondeado', () => {
      const calibrated = calibrateProjection(225.567, 'FULL');
      expect(Number.isInteger(calibrated * 10)).toBe(true);
    });
  });

  describe('predict quarantine', () => {
    it('rejects legacy inference instead of inventing probabilities', () => {
      expect(() => predict({homeTeam:{},awayTeam:{},line:220})).toThrow('LEGACY_PROBABILITY_DISABLED');
    });
  });

  describe('quickPredict quarantine', () => {
    it('rejects legacy inference instead of inventing probabilities', () => {
      expect(() => quickPredict(110,110,220)).toThrow('LEGACY_PROBABILITY_DISABLED');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// TESTS DE INVARIANTES
// ═══════════════════════════════════════════════════════════════

// Probability invariants now live in tests/unit/probability-contract.test.js.
