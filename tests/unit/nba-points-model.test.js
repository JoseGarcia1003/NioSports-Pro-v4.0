// @vitest-environment node
import { it, expect } from 'vitest';
import { countPmf, lineProbabilities, quantile, wilson } from '../../src/lib/stats/distributions.js';
import { scoreForecasts, intervalCoverage, fitPlatt, applyPlatt } from '../../src/lib/stats/calibration.js';
import { pointsDistribution, probabilityFor, MODEL } from '../../src/lib/models/nba-points.js';
import { evaluate, referenceLine } from '../../scripts/lib/nba-points-backtest.mjs';
import evaluation from '../../src/lib/models/evaluations/nba-points-1.0.0.json';

const day = (i) => new Date(Date.UTC(2026, 0, 1) + i * 86400e3).toISOString().slice(0, 10);

it('count distributions are proper and match known values', () => {
  const pois = countPmf(3, 3, 60);
  expect(pois.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
  expect(pois[2]).toBeCloseTo(Math.exp(-3) * 4.5, 12);
  const nb = countPmf(20, 60, 120);
  expect(nb.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 8);
  const mean = nb.reduce((s, x, k) => s + k * x, 0);
  expect(mean).toBeCloseTo(20, 4);
  expect(nb.reduce((s, x, k) => s + (k - mean) ** 2 * x, 0)).toBeCloseTo(60, 2);
  const lp = lineProbabilities(nb, 20);
  expect(lp.over + lp.under + lp.push).toBeCloseTo(1, 8);
  expect(lineProbabilities(nb, 20.5).push).toBe(0);
  expect(quantile(pois, 0.5)).toBe(3);
});

it('Wilson interval behaves at the edges', () => {
  expect(wilson(0, 0)).toBeNull();
  const w = wilson(50, 100);
  expect(w.low).toBeCloseTo(0.4038, 3); expect(w.high).toBeCloseTo(0.5962, 3);
  expect(wilson(10, 10).high).toBe(1);
});

it('scores forecasts and never treats small samples as conclusive', () => {
  const s = scoreForecasts([{ p: 0.8, outcome: 'hit' }, { p: 0.8, outcome: 'miss' }, { p: 0.5, outcome: 'push' }, { p: 0.6, outcome: 'void' }, { p: 0.6, outcome: 'pending' }]);
  expect(s).toMatchObject({ total: 5, hit: 1, miss: 1, push: 1, void: 1, pending: 1, decided: 2, conclusive: false });
  expect(s.brier).toBeCloseTo((0.04 + 0.64) / 2, 10);
  expect(s.logLoss).toBeCloseTo(-(Math.log(0.8) + Math.log(0.2)) / 2, 10);
  expect(scoreForecasts([]).hitRate).toBeNull();
  // Regression: forecasts without a probability still count for the hit rate.
  const legacy = scoreForecasts([{ p: null, outcome: 'hit' }, { outcome: 'miss' }, { p: 0.7, outcome: 'hit' }]);
  expect(legacy).toMatchObject({ decided: 3, hit: 2, scored: 1 });
  expect(legacy.hitRate).toBeCloseTo(2 / 3, 10); expect(legacy.brier).toBeCloseTo(0.09, 10);
  expect(intervalCoverage([{ interval: [1, 3], actual: 2 }, { interval: [1, 3], actual: 5 }]).coverage).toBe(0.5);
});

it('Platt fitting recovers a known distortion', () => {
  const rows = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 4000; i++) { const t = 0.2 + 0.6 * rnd(); const p = 1 / (1 + Math.exp(-2 * Math.log(t / (1 - t)))); rows.push({ p, outcome: rnd() < t ? 'hit' : 'miss' }); }
  const c = fitPlatt(rows);
  expect(c.b).toBeGreaterThan(0.4); expect(c.b).toBeLessThan(0.6);
  expect(applyPlatt(0.5, null)).toBe(0.5);
});

it('the model never uses the game it predicts or any later game (no leakage)', () => {
  const hist = Array.from({ length: 30 }, (_, i) => ({ date: day(30 - i), pts: 20, minutes: 30 }));
  const withFuture = [{ date: day(40), pts: 90, minutes: 30 }, { date: day(31), pts: 90, minutes: 30 }, ...hist];
  const a = pointsDistribution(hist, day(31)), b = pointsDistribution(withFuture, day(31));
  expect(b.mean).toBe(a.mean); expect(b.games).toBe(30);
});

it('ignores did-not-play games and needs a minimum history', () => {
  const hist = Array.from({ length: 4 }, (_, i) => ({ date: day(10 - i), pts: 15, minutes: 25 }));
  expect(pointsDistribution(hist, day(11))).toBeNull();
  const dnp = [...hist, { date: day(5), pts: 0, minutes: 0 }, { date: day(4), pts: 0, minutes: 0 }];
  expect(pointsDistribution(dnp, day(11))).toBeNull();
});

it('returns a probability, a push share for integer lines and an 80 % interval', () => {
  const hist = Array.from({ length: 20 }, (_, i) => ({ date: day(20 - i), pts: [18, 22, 25, 19, 30][i % 5], minutes: 34 }));
  const d = pointsDistribution(hist, day(21));
  const over = probabilityFor(d, 22.5, 'over'), under = probabilityFor(d, 22.5, 'under');
  expect(over.p + under.p).toBeCloseTo(1, 3);
  expect(probabilityFor(d, 22, 'over').push).toBeGreaterThan(0);
  expect(d.interval80[0]).toBeLessThan(d.mean); expect(d.interval80[1]).toBeGreaterThan(d.mean);
  expect(over.model).toBe(`${MODEL.id}@${MODEL.version}`);
});

it('reference line mirrors the app (median of 10, nudged to .5)', () => {
  expect(referenceLine(Array.from({ length: 10 }, (_, i) => ({ pts: i + 1 })))).toBe(5.5);
  expect(referenceLine(Array.from({ length: 10 }, () => ({ pts: 12 })))).toBe(12.5);
  expect(referenceLine([{ pts: 1 }])).toBeNull();
});

it('the committed evaluation is reproducible from the committed sample', async () => {
  const { readFileSync } = await import('node:fs');
  const rows = JSON.parse(readFileSync('ml/backtest/nba-points-sample-2025-26.json', 'utf8'));
  const r = evaluate(rows, { split: evaluation.split });
  expect(r.games).toBe(evaluation.testGames);
  expect(r.recalibratedScores.brier).toBeCloseTo(evaluation.calibrated.brier, 6);
  // The documented claim: better than the naive L10 rule out of sample.
  expect(evaluation.calibrated.brier).toBeLessThan(evaluation.naiveL10.brier);
});
