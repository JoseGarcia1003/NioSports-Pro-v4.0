// @vitest-environment node
import { it, expect } from 'vitest';
import { makeSeal, GENESIS } from '../../src/lib/integrity/seal.js';
import { settledEntries, trackRecord } from '../../src/lib/stats/transparency.js';

it('counts every sealed entry; nothing can be dropped selectively', async () => {
  const entries = [
    { playerId: 1, name: 'A', side: 'over', line: 20.5, model: { p: 0.6, model: 'nba-points@1.0.0', interval80: [12, 30] } },
    { playerId: 2, name: 'B', side: 'under', line: 10.5, model: { p: 0.55, model: 'nba-points@1.0.0' } },
    { playerId: 3, name: 'C', side: 'over', line: 15, model: null },
    { playerId: 4, name: 'D', side: 'over', line: 8.5 },
    { playerId: 5, name: 'E', side: 'under', line: 9.5 }
  ];
  const { text, hash } = await makeSeal({ editionKey: 'nba:points:2026-11-08', sport: 'nba', market: 'points', day: '2026-11-08', sealedAt: '2026-11-08T15:00:00Z', firstEventAt: '2026-11-09T00:00:00Z', revealAfter: '2026-11-09T02:00:00Z', model: { id: 'nba-points', version: '1.0.0' }, entries, prevHash: GENESIS });
  const box = { 1: { pts: 25, minutes: 30 }, 2: { pts: 14, minutes: 28 }, 3: { pts: 15, minutes: 20 }, 4: { pts: 0, minutes: 0 } };
  const rows = settledEntries({ seq: 1, hash, text, backfilled: false }, e => box[e.playerId] || null);
  expect(rows.map(r => r.outcome)).toEqual(['hit', 'miss', 'push', 'void', 'pending']);
  const t = trackRecord(rows);
  expect(t.overall).toMatchObject({ total: 5, hit: 1, miss: 1, push: 1, void: 1, pending: 1, decided: 2, conclusive: false });
  expect(t.probabilistic.scored).toBe(2);
  expect(t.probabilistic.brier).toBeCloseTo(((0.4) ** 2 + (0.55) ** 2) / 2, 10);
  expect(t.byMonth[0].key).toBe('2026-11');
  expect(t.retroactive.total).toBe(0);
});
