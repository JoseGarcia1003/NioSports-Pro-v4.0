// Scoring and calibration of probabilistic forecasts. A forecast is
// { p: probability the predicted side wins, outcome: 'hit'|'miss'|'push'|'void'|'pending' }.
// Only hits and misses are scored; pushes, voids and pending are counted, never dropped silently.
import { wilson } from './distributions.js';

const EPS = 1e-6;
/** Minimum decided forecasts before any rate is described as more than anecdotal. */
export const MIN_SAMPLE = 100;

export function scoreForecasts(forecasts, { bins = 10 } = {}) {
  const counts = { hit: 0, miss: 0, push: 0, void: 0, pending: 0 };
  const scored = [];
  for (const f of forecasts) {
    if (!(f.outcome in counts)) continue;
    counts[f.outcome]++;
    if ((f.outcome === 'hit' || f.outcome === 'miss') && Number.isFinite(f.p)) scored.push({ p: Math.min(1 - EPS, Math.max(EPS, f.p)), y: f.outcome === 'hit' ? 1 : 0 });
  }
  // Hit rate uses every decided forecast; probability scores only those that carried a probability.
  const decided = counts.hit + counts.miss;
  const total = forecasts.length;
  const base = { total, ...counts, decided, hitRate: decided ? counts.hit / decided : null, hitRateCI: wilson(counts.hit, decided), conclusive: decided >= MIN_SAMPLE, scored: scored.length };
  const n = scored.length;
  if (!n) return { ...base, brier: null, logLoss: null, meanP: null, baselineBrier: null, skill: null, reliability: [] };
  const hits = scored.reduce((s, d) => s + d.y, 0);
  const brier = scored.reduce((s, d) => s + (d.p - d.y) ** 2, 0) / n;
  const logLoss = -scored.reduce((s, d) => s + (d.y ? Math.log(d.p) : Math.log(1 - d.p)), 0) / n;
  const rate = hits / n;
  // Climatology reference: always forecasting the observed base rate of the scored set.
  const baselineBrier = rate * (1 - rate);
  const reliability = [];
  for (let b = 0; b < bins; b++) {
    const lo = b / bins, hi = (b + 1) / bins;
    const inBin = scored.filter(d => d.p >= lo && (b === bins - 1 ? d.p <= hi : d.p < hi));
    if (!inBin.length) continue;
    const h = inBin.reduce((s, d) => s + d.y, 0);
    reliability.push({ lo, hi, n: inBin.length, meanP: inBin.reduce((s, d) => s + d.p, 0) / inBin.length, observed: h / inBin.length, ci: wilson(h, inBin.length) });
  }
  return { ...base, brier, logLoss, meanP: scored.reduce((s, d) => s + d.p, 0) / n, scoredHitRate: rate,
    baselineBrier, skill: baselineBrier > 0 ? 1 - brier / baselineBrier : null, reliability };
}

/** Share of outcomes inside their predictive interval (80 % intervals should cover ~80 %). */
export function intervalCoverage(rows) {
  const valid = rows.filter(r => Array.isArray(r.interval) && Number.isFinite(r.actual));
  if (!valid.length) return null;
  const inside = valid.filter(r => r.actual >= r.interval[0] && r.actual <= r.interval[1]).length;
  return { n: valid.length, coverage: inside / valid.length, ci: wilson(inside, valid.length) };
}

const logit = p => Math.log(p / (1 - p));
const sigmoid = x => 1 / (1 + Math.exp(-x));
/** Platt recalibration p' = σ(a + b·logit p), fitted by Newton's method on decided forecasts. */
export function fitPlatt(forecasts, iterations = 50) {
  const d = forecasts.filter(f => f.outcome === 'hit' || f.outcome === 'miss').map(f => ({ x: logit(Math.min(1 - EPS, Math.max(EPS, f.p))), y: f.outcome === 'hit' ? 1 : 0 }));
  if (d.length < 50) return null;
  let a = 0, b = 1;
  for (let i = 0; i < iterations; i++) {
    let ga = 0, gb = 0, haa = 0, hab = 0, hbb = 0;
    for (const { x, y } of d) { const p = sigmoid(a + b * x), w = p * (1 - p); ga += p - y; gb += (p - y) * x; haa += w; hab += w * x; hbb += w * x * x; }
    const det = haa * hbb - hab * hab;
    if (Math.abs(det) < 1e-12) break;
    a -= (hbb * ga - hab * gb) / det; b -= (haa * gb - hab * ga) / det;
  }
  return { a, b, n: d.length };
}
export const applyPlatt = (p, c) => (c ? sigmoid(c.a + c.b * logit(Math.min(1 - EPS, Math.max(EPS, p)))) : p);
