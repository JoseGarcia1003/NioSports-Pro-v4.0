// Count distributions used by the props models. Pure functions, no I/O.

/** Negative binomial pmf array 0..max for mean mu and variance v (> mu); Poisson if v <= mu. */
export function countPmf(mu, v, max) {
  if (!(mu > 0) || !Number.isFinite(mu)) throw new RangeError('mean must be positive');
  const pmf = new Float64Array(max + 1);
  if (v <= mu * 1.0001) {
    pmf[0] = Math.exp(-mu);
    for (let k = 1; k <= max; k++) pmf[k] = pmf[k - 1] * mu / k;
  } else {
    const r = (mu * mu) / (v - mu), p = r / (r + mu);
    pmf[0] = Math.exp(r * Math.log(p));
    for (let k = 1; k <= max; k++) pmf[k] = pmf[k - 1] * ((k - 1 + r) / k) * (1 - p);
  }
  return pmf;
}

/** P(X > line), P(X == line) (only for integer lines) and P(X < line). */
export function lineProbabilities(pmf, line) {
  let below = 0, at = 0;
  for (let k = 0; k < pmf.length; k++) {
    if (k < line) below += pmf[k];
    else if (k === line) at += pmf[k];
  }
  const over = Math.max(0, 1 - below - at);
  return { over, push: at, under: below };
}

/** Smallest k with CDF(k) >= q. */
export function quantile(pmf, q) {
  let c = 0;
  for (let k = 0; k < pmf.length; k++) { c += pmf[k]; if (c >= q) return k; }
  return pmf.length - 1;
}

/** Wilson score interval for a proportion (z = 1.96 → 95 %). */
export function wilson(successes, n, z = 1.96) {
  if (!n) return null;
  const p = successes / n, z2 = z * z, den = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / den, half = (z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / den;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}
