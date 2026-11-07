// Server-side access to premium content. While PREMIUM_GATING_ENABLED is not
// 'true' (open beta) everything stays free. When enabled, free accounts receive
// one complete selection per day (the top-ranked one) and the rest is redacted
// HERE, before the response leaves the server; hiding it in the UI is not enough.
export const gatingEnabled = env => env.PREMIUM_GATING_ENABLED === 'true';
export const isPaid = plan => plan === 'pro' || plan === 'elite';

export function gateEdition(edition, { plan, enabled }) {
  if (!edition || !enabled || isPaid(plan)) return { edition, locked: 0 };
  const [free, ...rest] = edition.entries;
  const redacted = rest.map(e => ({ locked: true, team: e.team, opponent: e.opponent, tipoff: e.tipoff, stat: e.stat }));
  return { edition: { ...edition, entries: free ? [{ ...free, freePick: true }, ...redacted] : [] }, locked: redacted.length };
}
