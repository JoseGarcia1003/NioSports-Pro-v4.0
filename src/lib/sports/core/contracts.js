// Normalised contracts shared by every sport. Adapters translate provider
// responses into these shapes; nothing downstream reads provider JSON.
// Each record carries provenance: which provider, when fetched, which request.

export const STATUSES = Object.freeze(['scheduled', 'live', 'final', 'postponed', 'cancelled', 'unknown']);

const isIso = v => typeof v === 'string' && Number.isFinite(Date.parse(v));
const nonEmpty = v => typeof v === 'string' && v.trim().length > 0;

/** Validates a normalised event; returns { ok, issues } (never throws). */
export function validateEvent(e) {
  const issues = [];
  if (!e || typeof e !== 'object') return { ok: false, issues: ['not_object'] };
  if (!nonEmpty(e.id)) issues.push('id');
  if (!['nba', 'football', 'tennis', 'mlb'].includes(e.sport)) issues.push('sport');
  if (!isIso(e.startsAt)) issues.push('startsAt');
  if (!STATUSES.includes(e.status)) issues.push('status');
  if (!nonEmpty(e.home?.name) || !nonEmpty(e.away?.name)) issues.push('participants');
  if (e.home?.name && e.home.name === e.away?.name) issues.push('same_participants');
  if (e.score != null) {
    const { home, away } = e.score;
    if (![home, away].every(x => x == null || (Number.isInteger(x) && x >= 0))) issues.push('score');
    if (e.status === 'final' && (home == null || away == null)) issues.push('final_without_score');
  }
  if (!e.provenance || !nonEmpty(e.provenance.provider) || !isIso(e.provenance.fetchedAt)) issues.push('provenance');
  return { ok: issues.length === 0, issues };
}

export function provenance(provider, fetchedAt, extra = {}) {
  return { provider, fetchedAt: new Date(fetchedAt).toISOString(), ...extra };
}

/**
 * Splits a batch into valid and rejected records and flags a suspicious batch
 * (e.g. a provider returning mostly broken rows) instead of silently using it.
 */
export function partition(records, validate = validateEvent, { maxRejectShare = 0.2 } = {}) {
  const valid = [], rejected = [];
  for (const r of records) { const v = validate(r); (v.ok ? valid : rejected).push(v.ok ? r : { record: r, issues: v.issues }); }
  const share = records.length ? rejected.length / records.length : 0;
  return { valid, rejected, inconsistent: share > maxRejectShare, rejectShare: share };
}

/** Removes duplicates by id, keeping the most recently fetched copy. */
export function dedupe(records) {
  const map = new Map();
  for (const r of records) {
    const prev = map.get(r.id);
    if (!prev || Date.parse(r.provenance.fetchedAt) >= Date.parse(prev.provenance.fetchedAt)) map.set(r.id, r);
  }
  return [...map.values()];
}
