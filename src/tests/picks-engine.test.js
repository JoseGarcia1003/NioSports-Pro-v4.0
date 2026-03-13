// src/tests/picks-engine.test.js
// ════════════════════════════════════════════════════════════════
// Unit tests para la lógica del motor predictivo de NioSports Pro.
//
// Cómo correr:
//   npm test                    → modo watch (rerun al cambiar archivos)
//   npm test -- --run           → una sola vez (para CI)
//   npm test -- --reporter=verbose  → output detallado
//
// ¿Qué testeamos?
//   1. calcTrends() — proyección de totales por período
//   2. Ajustes contextuales — B2B, lesiones, ventaja local/visitante
//   3. calcProb() — cálculo de probabilidad dado edge vs línea
//   4. roundHalf() — redondeo a .5 (crítico para líneas de apuesta)
//   5. Edge cases — equipos sin datos, valores cero, equipos iguales
//   6. Invariantes del modelo — propiedades que SIEMPRE deben cumplirse
//
// Por qué estos tests importan:
//   Si alguien cambia el modelo (los factores de ajuste, la fórmula
//   de proyección), los tests detectarán cambios no intencionales.
//   Especialmente crítico antes de añadir el modelo ML en Fase 7-9.
// ════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';

// ── Funciones extraídas del motor (replicadas aquí para testeo) ───
// En el proyecto real, estas funciones deberían estar en un archivo
// src/lib/picks-engine.js para que sean importables por los tests.
// Por ahora las replicamos aquí — en Fase 7 se refactorizan.

/**
 * Redondea al .5 más cercano (para líneas de apuesta).
 * 56.3 → 56.5 | 56.7 → 57.0 | 56.2 → 56.0
 */
function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

/**
 * Calcula las tendencias de totales para un partido.
 * @param {object} localData  - Stats del equipo local
 * @param {object} awayData   - Stats del equipo visitante
 * @param {object} factors    - Factores contextuales
 * @returns {{ q1, half, full, sugQ1, sugHalf, sugFull } | null}
 */
function calcTrends(localData, awayData, factors = {}) {
  if (!localData || !awayData) return null;

  const { localB2B = false, awayB2B = false, localInjury = false, awayInjury = false } = factors;

  let q1   = (localData.q1Home   ?? localData.q1   ?? 0) + (awayData.q1Away   ?? awayData.q1   ?? 0);
  let half = (localData.halfHome  ?? localData.half ?? 0) + (awayData.halfAway  ?? awayData.half ?? 0);
  let full = (localData.fullHome  ?? localData.full ?? 0) + (awayData.fullAway  ?? awayData.full ?? 0);

  if (localB2B)    { q1 -= 0.3; half -= 0.6; full -= 1.25; }
  if (awayB2B)     { q1 -= 0.3; half -= 0.6; full -= 1.25; }
  if (localInjury) { q1 -= 0.9; half -= 1.75; full -= 3.5; }
  if (awayInjury)  { q1 -= 0.9; half -= 1.75; full -= 3.5; }

  return {
    q1:   parseFloat(q1.toFixed(1)),
    half: parseFloat(half.toFixed(1)),
    full: parseFloat(full.toFixed(1)),
    sugQ1:   roundHalf(q1),
    sugHalf: roundHalf(half),
    sugFull: roundHalf(full),
  };
}

/**
 * Calcula la probabilidad de OVER o UNDER dado la proyección y la línea.
 * @param {number} trend  - Proyección del modelo
 * @param {number} line   - Línea de mercado
 * @param {'OVER'|'UNDER'} type
 * @returns {number} Probabilidad 0-100
 */
function calcProb(trend, line, type) {
  if (!trend || !line) return null;
  const diff = type === 'OVER'
    ? parseFloat(trend) - parseFloat(line)
    : parseFloat(line)  - parseFloat(trend);
  const prob = 50 + Math.min(Math.max(diff * 3.5, -25), 25);
  return Math.round(prob);
}

/**
 * Determina si un pick tiene edge estadístico (>52.4% win rate en -110).
 */
function hasEdge(probability) {
  return probability > 52.4;
}

// ── Fixtures ──────────────────────────────────────────────────────
// Stats representativas basadas en temporada 2024-25 NBA promedio

const LAKERS = {
  q1Home: 29.2, q1Away: 28.1,
  halfHome: 56.8, halfAway: 54.3,
  fullHome: 113.5, fullAway: 109.2,
  pace: 100.4,
};

const CELTICS = {
  q1Home: 31.1, q1Away: 29.8,
  halfHome: 60.2, halfAway: 57.6,
  fullHome: 119.8, fullAway: 115.4,
  pace: 99.2,
};

const WARRIORS = {
  q1Home: 30.5, q1Away: 28.9,
  halfHome: 58.3, halfAway: 55.1,
  fullHome: 116.2, fullAway: 111.3,
  pace: 101.2,
};

const HEAT = {
  q1Home: 27.4, q1Away: 26.8,
  halfHome: 52.1, halfAway: 50.3,
  fullHome: 107.6, fullAway: 104.2,
  pace: 97.8,
};

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

describe('roundHalf()', () => {
  it('redondea .25 al .5 superior', () => {
    expect(roundHalf(56.25)).toBe(56.5);
  });

  it('redondea .75 al 1.0', () => {
    expect(roundHalf(56.75)).toBe(57);
  });

  it('mantiene .5 exacto', () => {
    expect(roundHalf(56.5)).toBe(56.5);
  });

  it('mantiene .0 exacto', () => {
    expect(roundHalf(56.0)).toBe(56);
  });

  it('redondea número negativo', () => {
    expect(roundHalf(-0.3)).toBe(-0.5);
  });

  it('maneja cero', () => {
    expect(roundHalf(0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('calcTrends() — proyección base', () => {
  it('devuelve null si localData es null', () => {
    expect(calcTrends(null, CELTICS)).toBeNull();
  });

  it('devuelve null si awayData es null', () => {
    expect(calcTrends(LAKERS, null)).toBeNull();
  });

  it('devuelve null si ambos son null', () => {
    expect(calcTrends(null, null)).toBeNull();
  });

  it('calcula tendencia Q1 Lakers (local) vs Celtics (visitante)', () => {
    // localData.q1Home + awayData.q1Away = 29.2 + 29.8 = 59.0
    const result = calcTrends(LAKERS, CELTICS);
    expect(result).not.toBeNull();
    expect(result.q1).toBeCloseTo(59.0, 1);
  });

  it('calcula tendencia HALF Lakers vs Celtics', () => {
    // 56.8 + 57.6 = 114.4
    const result = calcTrends(LAKERS, CELTICS);
    expect(result.half).toBeCloseTo(114.4, 1);
  });

  it('calcula tendencia FULL Lakers vs Celtics', () => {
    // 113.5 + 115.4 = 228.9
    const result = calcTrends(LAKERS, CELTICS);
    expect(result.full).toBeCloseTo(228.9, 1);
  });

  it('sugQ1 es el q1 redondeado a .5', () => {
    const result = calcTrends(LAKERS, CELTICS);
    expect(result.sugQ1).toBe(roundHalf(result.q1));
  });

  it('sugHalf es el half redondeado a .5', () => {
    const result = calcTrends(LAKERS, CELTICS);
    expect(result.sugHalf).toBe(roundHalf(result.half));
  });

  it('sugFull es el full redondeado a .5', () => {
    const result = calcTrends(LAKERS, CELTICS);
    expect(result.sugFull).toBe(roundHalf(result.full));
  });

  it('FULL > HALF > Q1 en condiciones normales', () => {
    const result = calcTrends(WARRIORS, HEAT);
    expect(result.full).toBeGreaterThan(result.half);
    expect(result.half).toBeGreaterThan(result.q1);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('calcTrends() — factores contextuales', () => {
  const baseline = calcTrends(LAKERS, CELTICS);

  it('B2B local reduce la proyección', () => {
    const withB2B = calcTrends(LAKERS, CELTICS, { localB2B: true });
    expect(withB2B.full).toBeLessThan(baseline.full);
    expect(withB2B.full).toBeCloseTo(baseline.full - 1.25, 1);
  });

  it('B2B visitante reduce la proyección', () => {
    const withB2B = calcTrends(LAKERS, CELTICS, { awayB2B: true });
    expect(withB2B.full).toBeCloseTo(baseline.full - 1.25, 1);
  });

  it('B2B doble reduce la proyección 2.5 pts en partido completo', () => {
    const withBothB2B = calcTrends(LAKERS, CELTICS, { localB2B: true, awayB2B: true });
    expect(withBothB2B.full).toBeCloseTo(baseline.full - 2.5, 1);
  });

  it('lesión estrella local reduce 3.5 pts en FULL', () => {
    const withInjury = calcTrends(LAKERS, CELTICS, { localInjury: true });
    expect(withInjury.full).toBeCloseTo(baseline.full - 3.5, 1);
  });

  it('lesión estrella visitante reduce 3.5 pts en FULL', () => {
    const withInjury = calcTrends(LAKERS, CELTICS, { awayInjury: true });
    expect(withInjury.full).toBeCloseTo(baseline.full - 3.5, 1);
  });

  it('doble lesión reduce 7 pts en FULL', () => {
    const withBothInjury = calcTrends(LAKERS, CELTICS, { localInjury: true, awayInjury: true });
    expect(withBothInjury.full).toBeCloseTo(baseline.full - 7.0, 1);
  });

  it('B2B + lesión combinados suman correctamente', () => {
    const combined = calcTrends(LAKERS, CELTICS, { localB2B: true, awayInjury: true });
    // -1.25 (B2B) - 3.5 (lesión) = -4.75
    expect(combined.full).toBeCloseTo(baseline.full - 4.75, 1);
  });

  it('los factores afectan Q1 con el peso correcto', () => {
    const withB2B = calcTrends(LAKERS, CELTICS, { localB2B: true });
    expect(withB2B.q1).toBeCloseTo(baseline.q1 - 0.3, 1);
  });

  it('los factores afectan HALF con el peso correcto', () => {
    const withInjury = calcTrends(LAKERS, CELTICS, { localInjury: true });
    expect(withInjury.half).toBeCloseTo(baseline.half - 1.75, 1);
  });

  it('sin factores, devuelve el mismo resultado que el baseline', () => {
    const noFactors = calcTrends(LAKERS, CELTICS, {});
    expect(noFactors.full).toBe(baseline.full);
    expect(noFactors.half).toBe(baseline.half);
    expect(noFactors.q1).toBe(baseline.q1);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('calcProb()', () => {
  it('devuelve 50 cuando trend === line (sin edge)', () => {
    expect(calcProb(220, 220, 'OVER')).toBe(50);
    expect(calcProb(220, 220, 'UNDER')).toBe(50);
  });

  it('OVER es >50 cuando trend > line', () => {
    expect(calcProb(225, 220, 'OVER')).toBeGreaterThan(50);
  });

  it('OVER es <50 cuando trend < line', () => {
    expect(calcProb(215, 220, 'OVER')).toBeLessThan(50);
  });

  it('UNDER es >50 cuando trend < line', () => {
    expect(calcProb(215, 220, 'UNDER')).toBeGreaterThan(50);
  });

  it('UNDER es <50 cuando trend > line', () => {
    expect(calcProb(225, 220, 'UNDER')).toBeLessThan(50);
  });

  it('no supera 75% (límite máximo)', () => {
    // diff enorme: 30 pts → 50 + min(105, 25) = 75
    expect(calcProb(250, 220, 'OVER')).toBeLessThanOrEqual(75);
  });

  it('no baja de 25% (límite mínimo)', () => {
    expect(calcProb(190, 220, 'OVER')).toBeGreaterThanOrEqual(25);
  });

  it('devuelve null si trend es null', () => {
    expect(calcProb(null, 220, 'OVER')).toBeNull();
  });

  it('devuelve null si line es null', () => {
    expect(calcProb(220, null, 'OVER')).toBeNull();
  });

  it('OVER y UNDER son complementarios para el mismo edge', () => {
    const overProb  = calcProb(225, 220, 'OVER');
    const underProb = calcProb(225, 220, 'UNDER');
    // overProb + underProb debería ser ~100
    expect(overProb + underProb).toBe(100);
  });

  it('5 pts de edge → probabilidad razonable (55-75%)', () => {
    const prob = calcProb(225, 220, 'OVER');
    expect(prob).toBeGreaterThanOrEqual(55);
    expect(prob).toBeLessThanOrEqual(75);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('hasEdge()', () => {
  it('tiene edge con 52.5%', ()  => expect(hasEdge(52.5)).toBe(true));
  it('tiene edge con 68%', ()    => expect(hasEdge(68)).toBe(true));
  it('no tiene edge con 52.4%',  () => expect(hasEdge(52.4)).toBe(false));
  it('no tiene edge con 50%',    () => expect(hasEdge(50)).toBe(false));
  it('no tiene edge con 40%',    () => expect(hasEdge(40)).toBe(false));
});

// ─────────────────────────────────────────────────────────────────
describe('Invariantes del modelo', () => {
  it('partido de equipos altos → proyección FULL > 220', () => {
    // Lakers vs Celtics: dos de los equipos con más puntos
    const result = calcTrends(LAKERS, CELTICS);
    expect(result.full).toBeGreaterThan(220);
  });

  it('partido de equipos bajos → proyección FULL < 220', () => {
    // Heat vs Heat (equipos defensivos): totales bajos
    const result = calcTrends(HEAT, HEAT);
    expect(result.full).toBeLessThan(220);
  });

  it('proyección Q1 es aproximadamente 25% del partido completo', () => {
    const result = calcTrends(WARRIORS, CELTICS);
    const ratio = result.q1 / result.full;
    // Entre 22% y 28% — rango razonable para un cuarto
    expect(ratio).toBeGreaterThan(0.22);
    expect(ratio).toBeLessThan(0.28);
  });

  it('proyección HALF es aproximadamente 48-52% del partido completo', () => {
    const result = calcTrends(LAKERS, HEAT);
    const ratio = result.half / result.full;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });

  it('partido SIEMPRE tiene valores positivos', () => {
    // Con todos los factores negativos activos
    const worstCase = calcTrends(HEAT, HEAT, {
      localB2B: true, awayB2B: true,
      localInjury: true, awayInjury: true,
    });
    expect(worstCase.q1).toBeGreaterThan(0);
    expect(worstCase.half).toBeGreaterThan(0);
    expect(worstCase.full).toBeGreaterThan(0);
  });

  it('la sugerencia de línea está dentro de ±0.5 de la proyección', () => {
    const result = calcTrends(WARRIORS, CELTICS);
    expect(Math.abs(result.sugFull - result.full)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(result.sugHalf - result.half)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(result.sugQ1   - result.q1  )).toBeLessThanOrEqual(0.5);
  });

  it('picks con confianza <52.4% nunca tienen edge', () => {
    // Si el modelo da <52.4%, no deberíamos recomendar el pick
    const lowConfidencePicks = [45, 50, 52, 52.3];
    lowConfidencePicks.forEach(prob => {
      expect(hasEdge(prob)).toBe(false);
    });
  });

  it('el modelo es simétrico (mismo partido swap local/visitante produce valores similares)', () => {
    // Nota: NO idénticos porque usamos stats home/away separadas
    const lakersHome = calcTrends(LAKERS, CELTICS);
    const celticsHome = calcTrends(CELTICS, LAKERS);
    // La diferencia no debería ser mayor de 15 pts (ventaja local real)
    expect(Math.abs(lakersHome.full - celticsHome.full)).toBeLessThan(15);
  });
});
