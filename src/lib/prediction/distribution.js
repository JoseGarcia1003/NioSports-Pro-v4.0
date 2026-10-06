import { finite, reject } from './contracts.js';

export const PROBABILITY_VERSION = 'event-probability-1';
export function totalLine(line) {
  if (!finite(line) || line <= 0 || !Number.isSafeInteger(line * 2)) reject('UNSUPPORTED_TOTAL_LINE');
  return line;
}

// Exact summation over an explicit complete PMF. No fitted spread, tail truncation or renormalization.
export function totalOutcomes(points, line) {
  totalLine(line);
  if (!Array.isArray(points) || !points.length || points.length > 10000) reject('INVALID_POINT_DISTRIBUTION');
  const seen = new Set();
  const result = { over:0, under:0, push:0 };
  for (const row of points) {
    if (!row || Object.keys(row).length !== 2 || !Number.isSafeInteger(row.total) || row.total < 0 ||
        seen.has(row.total) || !finite(row.mass) || row.mass < 0 || row.mass > 1) reject('INVALID_POINT_DISTRIBUTION');
    seen.add(row.total);
    result[row.total > line ? 'over' : row.total < line ? 'under' : 'push'] += row.mass;
  }
  if (Object.values(result).some(p => p > 1) || Math.abs(result.over + result.under + result.push - 1) > 1e-10)
    reject('INCOMPLETE_PROBABILITY_MASS');
  return result;
}

export function eloOutcomes(ratingA, ratingB) {
  if (!finite(ratingA) || !finite(ratingB)) reject('INVALID_RATINGS');
  // Fixed Elo scale, not an extra tunable calibration parameter.
  const a = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  return { a, b:1-a };
}

// Only controlled fixtures are admitted. A real distribution needs its own certified artifact path.
export function fixtureTotalDistribution(context, projectionManifest, points, artifactHash) {
  if (context.origin !== 'fixture' || projectionManifest.validation !== 'fixture') reject('FIXTURE_MODEL_FORBIDDEN');
  totalOutcomes(points, 1);
  const copy = structuredClone(points);
  return { manifest: { ...projectionManifest, id:projectionManifest.id + ':pmf-fixture', stage:'probability',
    probabilityContractVersion:PROBABILITY_VERSION, method:'discrete-pmf-1', artifactHash,
    projectionModelId:projectionManifest.id, projectionArtifactHash:projectionManifest.artifactHash },
    run(value, line) {
      if (!value || !finite(value.mean) || Math.abs(copy.reduce((s,p)=>s+p.total*p.mass,0)-value.mean)>1e-8)
        reject('DISTRIBUTION_MEAN_MISMATCH');
      return totalOutcomes(copy, line);
    } };
}
