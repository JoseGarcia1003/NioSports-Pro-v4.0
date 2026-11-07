// Shared walk-forward evaluation (used by the CLI and the unit tests).
import { pointsDistribution, probabilityFor, MODEL } from '../../src/lib/models/nba-points.js';
import { scoreForecasts, intervalCoverage, fitPlatt, applyPlatt } from '../../src/lib/stats/calibration.js';

export function referenceLine(prior) {
  const s = prior.slice(0, 10).map(g => g.pts).sort((a, b) => a - b);
  if (s.length < 10) return null;
  const m = (s[4] + s[5]) / 2;
  return Number.isInteger(m) ? m + 0.5 : Math.floor(m) + 0.5;
}

export function byPlayer(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!Number.isFinite(r.pts)) continue;
    (map.get(r.player) || map.set(r.player, []).get(r.player)).push({ date: r.date, pts: r.pts, minutes: Number(r.minutes) });
  }
  for (const list of map.values()) list.sort((a, b) => b.date.localeCompare(a.date));
  return map;
}

/** Forecast rows for every scoreable game (date >= from), using strictly earlier games. */
export function forecasts(rows, params = MODEL.params, from = null, to = null) {
  const out = [];
  for (const games of byPlayer(rows).values()) {
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      if (!(g.minutes > 0) || (from && g.date < from) || (to && g.date >= to)) continue;
      const prior = games.slice(i + 1).filter(x => x.minutes > 0 && x.date < g.date);
      const line = referenceLine(prior);
      if (line == null) continue;
      const dist = pointsDistribution(prior, g.date, params);
      if (!dist) continue;
      const pr = probabilityFor(dist, line, 'over', { calibrated: false });
      // Naive baseline: share of the last 10 games over the line.
      const naive = prior.slice(0, 10).filter(x => x.pts > line).length / 10;
      out.push({ date: g.date, line, p: pr.p, naive, actual: g.pts, interval: dist.interval80, outcome: g.pts > line ? 'hit' : 'miss' });
    }
  }
  return out;
}

const pick = s => ({ n: s.decided, brier: s.brier, logLoss: s.logLoss, skillVsBaseRate: s.skill, hitRate: s.hitRate, meanP: s.meanP, reliability: s.reliability.map(b => ({ bin: `${b.lo.toFixed(1)}-${b.hi.toFixed(1)}`, n: b.n, meanP: +b.meanP.toFixed(3), observed: +b.observed.toFixed(3) })) });

export function evaluate(rows, { split = null, params = MODEL.params, calibrator = undefined } = {}) {
  const f = forecasts(rows, params, split);
  const model = scoreForecasts(f);
  // Recalibration is fitted only on games before the split and applied after it.
  const platt = calibrator !== undefined ? calibrator : (split ? fitPlatt(forecasts(rows, params, null, split)) : null);
  const recal = platt ? scoreForecasts(f.map(x => ({ p: applyPlatt(x.p, platt), outcome: x.outcome }))) : null;
  const naive = scoreForecasts(f.map(x => ({ p: Math.min(0.97, Math.max(0.03, x.naive)), outcome: x.outcome })));
  return { model: `${MODEL.id}@${MODEL.version}`, params, evaluatedFrom: split, games: f.length,
    modelScores: pick(model), calibrator: platt, recalibratedScores: recal && pick(recal), naiveL10Scores: pick(naive), interval80: intervalCoverage(f) };
}

/** Hyper-parameter search on games BEFORE the split, reported on games after it. */
export function grid(rows, split) {
  if (!split) throw new Error('--grid needs --split so selection never sees the test period');
  const results = [];
  for (const halfLife of [4, 6, 8, 12, 20]) for (const priorGames of [0, 4, 8, 12, 20]) for (const varianceFloor of [1.0, 1.2, 1.5]) for (const meanUncertainty of [0, 1, 2]) {
    const params = { ...MODEL.params, halfLife, priorGames, varianceFloor, meanUncertainty };
    const s = scoreForecasts(forecasts(rows, params, null, split));
    results.push({ halfLife, priorGames, varianceFloor, meanUncertainty, trainLogLoss: s.logLoss, trainBrier: s.brier, n: s.decided });
  }
  results.sort((a, b) => a.trainLogLoss - b.trainLogLoss);
  const best = results[0];
  const test = evaluate(rows, { split, params: { ...MODEL.params, halfLife: best.halfLife, priorGames: best.priorGames, varianceFloor: best.varianceFloor, meanUncertainty: best.meanUncertainty } });
  return { split, best, top5: results.slice(0, 5), test };
}
