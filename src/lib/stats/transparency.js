// Public track record computed from the sealed ledger only. Every sealed entry
// counts: settled ones as hit/miss/push/void, the rest as pending. Nothing can be
// left out selectively because the input is the whole hash chain.
import { settle } from '../nba/signals.js';
import { scoreForecasts } from './calibration.js';

/** Settled rows for one revealed seal record. boxFor(entry, day) → box score or null. */
export function settledEntries(seal, boxFor) {
  const doc = JSON.parse(seal.text);
  return doc.entries.map(e => {
    const r = settle(e, boxFor(e, doc.day));
    return { sport: doc.sport, market: doc.market, day: doc.day, model: e.model?.model || `${doc.model.id}@${doc.model.version}`,
      p: Number.isFinite(e.model?.p) ? e.model.p : null, outcome: r.status, actual: r.actual ?? null, interval: e.model?.interval80 ?? null,
      backfilled: !!seal.backfilled, seq: seal.seq, hash: seal.hash };
  });
}

const group = (rows, key) => {
  const m = new Map();
  for (const r of rows) (m.get(key(r)) || m.set(key(r), []).get(key(r))).push(r);
  return [...m.entries()].map(([k, list]) => ({ key: k, ...scoreForecasts(list) }));
};

export function trackRecord(rows) {
  const withP = rows.filter(r => r.p != null);
  return {
    overall: scoreForecasts(rows),
    // Calibration metrics only exist for entries that carried a model probability.
    probabilistic: scoreForecasts(withP),
    sealedBeforeEvent: scoreForecasts(rows.filter(r => !r.backfilled)),
    retroactive: scoreForecasts(rows.filter(r => r.backfilled)),
    bySport: group(rows, r => r.sport),
    byMarket: group(rows, r => `${r.sport}:${r.market}`),
    byModel: group(rows, r => r.model),
    byMonth: group(rows, r => r.day.slice(0, 7)).sort((a, b) => a.key.localeCompare(b.key))
  };
}
