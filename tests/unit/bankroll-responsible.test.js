// @vitest-environment node
import { it, expect } from 'vitest';
import { effectiveLimits, requestLimits, checkStake, riskAlerts, COOLING_OFF_MS } from '../../src/lib/bankroll/responsible.js';

const T0 = Date.parse('2026-11-07T12:00:00Z');
const t = (minsAgo, stake, status = 'pending', odds = 2) => ({ stake_minor: stake, odds, status, created_at: new Date(T0 - minsAgo * 60e3).toISOString() });

it('tightening applies now, loosening waits the cooling-off period', () => {
  let r = requestLimits({}, { maxStakeMinor: 5000 }, T0);
  expect(r.applied).toEqual({ maxStakeMinor: 5000 });
  r = requestLimits(r.state, { maxStakeMinor: 2000 }, T0);
  expect(effectiveLimits(r.state, T0).maxStakeMinor).toBe(2000);
  r = requestLimits(r.state, { maxStakeMinor: 10000 }, T0);
  expect(r.deferred).toEqual({ maxStakeMinor: 10000 });
  expect(effectiveLimits(r.state, T0 + COOLING_OFF_MS - 1).maxStakeMinor).toBe(2000);
  expect(effectiveLimits(r.state, T0 + COOLING_OFF_MS).maxStakeMinor).toBe(10000);
  // Removing a limit is also loosening.
  expect(requestLimits(r.state, { maxStakeMinor: null }, T0).deferred).toEqual({ maxStakeMinor: null });
  expect(() => requestLimits({}, { dailyStakeMinor: -1 }, T0)).toThrow();
});

it('a pause blocks stakes and can be extended but never shortened', () => {
  let r = requestLimits({}, { pauseDays: 7 }, T0);
  expect(checkStake(100, effectiveLimits(r.state, T0), [], T0)).toMatchObject({ allowed: false, reason: 'paused' });
  const until = r.state.pauseUntil;
  r = requestLimits(r.state, { pauseDays: 1 }, T0);
  expect(r.state.pauseUntil).toBe(until);
  expect(effectiveLimits(r.state, T0 + 8 * 86400e3).pauseUntil).toBeNull();
  expect(() => requestLimits({}, { pauseDays: 2 }, T0)).toThrow();
});

it('enforces per-ticket, daily and weekly-loss limits', () => {
  const lim = { maxStakeMinor: 1000, dailyStakeMinor: 1500, weeklyLossMinor: 2000 };
  expect(checkStake(1200, lim, [], T0).reason).toBe('max_stake');
  expect(checkStake(800, lim, [t(60, 800)], T0).reason).toBe('daily_stake');
  expect(checkStake(100, lim, [t(3000, 1000, 'loss'), t(4000, 1000, 'loss')], T0).reason).toBe('weekly_loss');
  expect(checkStake(100, lim, [t(3000, 1000, 'loss'), t(4000, 1000, 'win')], T0).allowed).toBe(true);
});

it('flags loss streaks, chasing and escalation without encouraging more stakes', () => {
  const a = riskAlerts([t(300, 100, 'loss'), t(200, 100, 'loss'), t(100, 100, 'loss')], T0);
  expect(a.map(x => x.id)).toContain('loss_streak');
  const chase = riskAlerts([t(100, 100, 'loss'), t(80, 300)], T0);
  expect(chase.map(x => x.id)).toContain('chasing');
  const esc = riskAlerts([t(60 * 24 * 10, 100, 'win'), t(60 * 24 * 20, 100, 'win'), t(60, 500), t(120, 500)], T0);
  expect(esc.map(x => x.id)).toContain('escalation');
  for (const x of [...a, ...chase, ...esc]) expect(x.text).not.toMatch(/apuesta más|aumenta tu|recupera/i);
});
