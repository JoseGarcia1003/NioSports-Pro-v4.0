// @vitest-environment node
import { it, expect } from 'vitest';
import { bankrollMetrics } from '../../src/lib/bankroll/metrics.js';

const t = (status, stake, odds = 2) => ({ status, stake_minor: stake, odds });
it('computes hit rate, yield and ROI from real stakes and odds', () => {
  const m = bankrollMetrics([t('win', 1000, 1.91), t('win', 2000, 2.5), t('loss', 1500), t('push', 500), t('void', 700), t('pending', 800)],
    { deposited_minor: 20000, withdrawn_minor: 5000, profit_minor: 910 + 3000 - 1500, settled_stake_minor: 4500 });
  expect(m).toMatchObject({ tickets: 6, decided: 3, won: 2, lost: 1, push: 1, void: 1, pending: 1, exposureMinor: 800, stakedMinor: 4500, profitMinor: 2410, consistentWithLedger: true, conclusive: false });
  expect(m.hitRate).toBeCloseTo(2 / 3, 10);
  expect(m.yield).toBeCloseTo(2410 / 4500, 10);
  expect(m.roi).toBeCloseTo(2410 / 15000, 10);
  expect(m.averageOdds).toBeCloseTo((1.91 + 2.5 + 2) / 3, 10);
  expect(m.hitRateCI.low).toBeLessThan(m.hitRate); expect(m.hitRateCI.high).toBeGreaterThan(m.hitRate);
});
it('never divides by zero and flags a ledger that disagrees with the tickets', () => {
  const empty = bankrollMetrics([], null);
  expect(empty).toMatchObject({ decided: 0, hitRate: null, yield: null, roi: null, averageOdds: null, consistentWithLedger: null });
  expect(bankrollMetrics([t('loss', 1000)], { deposited_minor: 0, withdrawn_minor: 0, profit_minor: -1000, settled_stake_minor: 1000 }).roi).toBeNull();
  expect(bankrollMetrics([t('win', 1000)], { deposited_minor: 5000, profit_minor: 999, settled_stake_minor: 1000 }).consistentWithLedger).toBe(false);
});
