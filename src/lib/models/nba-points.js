// nba-points model: a predictive distribution for a player's points in his next
// game, built only from games strictly before that game (no future information).
//
// Method (documented on /metodologia and versioned below):
//   1. Exponentially weighted mean of recent points (half-life H games), so form
//      matters more than old games without discarding them.
//   2. Shrink that mean towards the player's longer-run mean with prior weight K
//      games (empirical-Bayes style), which tames small, noisy samples.
//   3. Weighted variance, floored at the Poisson level (points are overdispersed
//      counts), drives a negative binomial distribution.
//   4. From it: P(over/under/push) for any line and an 80 % predictive interval.
//   5. A Platt recalibration of P(over), fitted on earlier games only.
// The hyper-parameters were fixed before testing; a grid search on the training
// period did NOT improve the held-out score, so it was not adopted (honest record
// in the evaluation file). Changing anything requires a new version and evaluation.
import { countPmf, lineProbabilities, quantile } from '../stats/distributions.js';
import { applyPlatt } from '../stats/calibration.js';

export const MODEL = Object.freeze({
  id: 'nba-points',
  version: '1.0.0',
  trainedAt: '2026-11-07',
  params: Object.freeze({ halfLife: 8, priorGames: 4, window: 40, longWindow: 82, minGames: 5, varianceFloor: 1.0, meanUncertainty: 0 }),
  // Platt recalibration fitted ONLY on sample games before 2026-02-15 (n = 2,216);
  // scored on the 1,373 later games (see evaluations/nba-points-1.0.0.json).
  calibration: Object.freeze({ a: 0.0678, b: 0.8885, fittedBefore: '2026-02-15', n: 2216 }),
  changelog: Object.freeze([
    '1.0.0 (2026-11-07): primera versión — media ponderada exponencial, contracción hacia la media larga, binomial negativa y recalibración de Platt.'
  ])
});

const MAX_POINTS = 90;

/**
 * @param {{date:string, pts:number, minutes:number}[]} history newest first; may include later games, which are dropped.
 * @param {string} beforeDate ISO day of the game being predicted; only games strictly earlier are used.
 */
export function pointsDistribution(history, beforeDate, params = MODEL.params) {
  const played = history
    .filter(g => g.date < beforeDate && Number.isFinite(g.pts) && Number(g.minutes) > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (played.length < params.minGames) return null;
  const recent = played.slice(0, params.window);
  let sw = 0, sm = 0;
  recent.forEach((g, i) => { const w = 0.5 ** (i / params.halfLife); sw += w; sm += w * g.pts; });
  const wMean = sm / sw;
  let sv = 0, sw2 = 0;
  recent.forEach((g, i) => { const w = 0.5 ** (i / params.halfLife); sv += w * (g.pts - wMean) ** 2; sw2 += w * w; });
  // Effective sample size of the weights (Kish) and unbiased weighted variance.
  const nEff = (sw * sw) / sw2;
  const wVar = nEff > 1 ? (sv / sw) * (nEff / (nEff - 1)) : wMean;
  const long = played.slice(0, params.longWindow);
  const longMean = long.reduce((s, g) => s + g.pts, 0) / long.length;
  const mean = Math.max(0.5, (nEff * wMean + params.priorGames * longMean) / (nEff + params.priorGames));
  // Predictive variance adds the uncertainty of the estimated mean (≈ variance / n_eff).
  const variance = Math.max(mean * params.varianceFloor, wVar) * (1 + (params.meanUncertainty ?? 0) / nEff);
  const pmf = countPmf(mean, variance, MAX_POINTS);
  return { mean, variance, sd: Math.sqrt(variance), games: played.length, nEff, pmf, lastGame: played[0].date,
    interval80: [quantile(pmf, 0.1), quantile(pmf, 0.9)] };
}

/** Probability summary for one line and side, rounded for display and sealing. */
export function probabilityFor(dist, line, side, { calibrated = true } = {}) {
  if (!dist) return null;
  const p = lineProbabilities(dist.pmf, line);
  const over = calibrated ? Math.min(1 - p.push, applyPlatt(p.over, MODEL.calibration)) : p.over;
  const win = side === 'under' ? Math.max(0, 1 - over - p.push) : over;
  const r = x => Math.round(x * 10000) / 10000;
  return { p: r(win), push: r(p.push), mean: Math.round(dist.mean * 10) / 10, sd: Math.round(dist.sd * 10) / 10,
    interval80: dist.interval80, games: dist.games, model: `${MODEL.id}@${MODEL.version}` };
}
