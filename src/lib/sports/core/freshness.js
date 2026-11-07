// Freshness policy: how old a dataset may be before a model must not use it.
// Pure; days are ISO dates (YYYY-MM-DD) and timestamps ISO strings.

/**
 * @param {{ maxAgeDays?: number, maxAgeHours?: number, offSeason?: string[] }} policy
 * @param {string|null} asOf last date/time covered by the data
 * @param {string|number} reference the day (YYYY-MM-DD) or epoch ms the data will be used for
 */
export function freshness(policy, asOf, reference) {
  if (!asOf) return { usable: false, status: 'missing', ageHours: null };
  const ref = typeof reference === 'number' ? reference : Date.parse(`${reference}T12:00:00Z`);
  const at = Date.parse(asOf.length === 10 ? `${asOf}T12:00:00Z` : asOf);
  if (!Number.isFinite(at) || !Number.isFinite(ref)) return { usable: false, status: 'invalid', ageHours: null };
  const ageHours = Math.max(0, (ref - at) / 3600e3);
  const limit = policy.maxAgeHours ?? (policy.maxAgeDays ?? 1) * 24;
  if (ageHours <= limit) return { usable: true, status: 'fresh', ageHours, limitHours: limit };
  return { usable: false, status: 'stale', ageHours, limitHours: limit };
}
