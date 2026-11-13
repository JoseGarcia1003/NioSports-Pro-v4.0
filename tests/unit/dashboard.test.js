// @vitest-environment node
import { it, expect, vi } from 'vitest';
vi.mock('$env/dynamic/private', () => ({ env: {} }));
import { dashboardNotices, recordLabel } from '../../src/lib/product/dashboard.js';
import { buildDashboard } from '../../src/lib/server/dashboard.js';

const NOW = Date.parse('2026-11-13T15:00:00Z');
it('lists only facts the server returned, most urgent first, and never urges a bet', () => {
  const n = dashboardNotices({ limits: { pauseUntil: '2026-11-20T12:00:00Z', alerts: [{ id: 'loss_streak', level: 'warning', text: 'Llevas 3 tickets perdidos seguidos.' }] },
    edition: { sealed: true, count: 4 }, record: { lastDay: { day: '2026-11-12', hits: 3, misses: 2, voids: 1, decided: 5 } }, data: { boxScoresThrough: '2026-11-12', fresh: true }, bankroll: { pendingTickets: 2 } }, NOW);
  expect(n.map(x => x.id)).toEqual(['pause', 'risk:loss_streak', 'edition', 'results', 'tickets']);
  expect(n.find(x => x.id === 'results').text).toBe('Resultados del 12 de noviembre: 3 de 5 señales acertadas, 1 anulada.');
  for (const x of n) expect(x.text).not.toMatch(/apuesta ya|no te lo pierdas|oportunidad|gana/i);
});
it('explains honestly why there is no edition and when data is old', () => {
  const n = dashboardNotices({ edition: { sealed: false, reason: 'data_stale' }, data: { boxScoresThrough: '2026-10-31', fresh: false } }, NOW);
  expect(n.map(x => [x.id, x.level])).toEqual([['edition', 'warn'], ['data', 'warn']]);
  expect(n[1].text).toContain('31 de octubre');
  expect(dashboardNotices({}, NOW)).toEqual([]);
  expect(dashboardNotices({ limits: { pauseUntil: '2026-11-01T00:00:00Z', alerts: [] } }, NOW)).toEqual([]);
});
it('never presents a small sample as a hit rate', () => {
  expect(recordLabel(null)).toEqual({ value: '—', note: 'Sin señales liquidadas todavía' });
  expect(recordLabel({ hits: 7, decided: 12 })).toEqual({ value: '7/12', note: 'Muestra pequeña (12 de 100)' });
  expect(recordLabel({ hits: 58, decided: 100 }).note).toBe('58 % de acierto');
});

function db({ edition = null, wallet = null, tickets = [], lastGame = '2026-11-12', fail = [] } = {}) {
  const table = name => {
    const q = { select: () => q, eq: () => q, lt: () => q, gte: () => q, in: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => { if (fail.includes(name)) return { data: null, error: { message: 'x' } };
        if (name === 'nba_signal_editions') return { data: edition, error: null };
        if (name === 'nba_player_games') return { data: lastGame ? { game_date: lastGame } : null, error: null };
        return { data: null, error: null }; },
      then: r => r(name === 'bankroll_tickets' ? { data: tickets, error: null } : { data: [], error: null }) };
    return q;
  };
  return { from: table, rpc: async fn => (fn === 'bankroll_snapshot' ? (fail.includes('bankroll') ? { data: null, error: { message: 'x' } } : { data: { wallet, entries: [], tickets: [], entryCount: 0 }, error: null }) : { data: [], error: null }) };
}
it('composes the dashboard and degrades block by block instead of failing whole', async () => {
  const d = await buildDashboard(db({ edition: { day: '2026-11-13', sealed_at: '2026-11-13T16:00:00Z', method: 'reading-v1', entries: [{ name: 'A', team: 'BOS', opponent: 'ORL', side: 'over', line: 20.5, tipoff: '2026-11-14T00:00:00Z', model: { p: 0.6, interval80: [12, 30] }, findings: [{ text: 'secret detail' }] }] },
    wallet: { available_minor: 5000, reserved_minor: 0, profit_minor: 1000, settled_stake_minor: 1000, deposited_minor: 4000, withdrawn_minor: 0 }, tickets: [{ status: 'win', stake_minor: 1000, odds: 2 }] }), 'u1', {}, NOW);
  expect(d.edition).toMatchObject({ sealed: true, count: 1 });
  expect(d.edition.top[0]).toEqual({ name: 'A', team: 'BOS', opponent: 'ORL', home: undefined, tipoff: '2026-11-14T00:00:00Z', side: 'over', line: 20.5, p: 0.6, interval80: [12, 30] });
  expect(d.bankroll).toMatchObject({ started: true, availableMinor: 5000, profitMinor: 1000 }); expect(d.bankroll.metrics.consistentWithLedger).toBe(true);
  expect(d.data).toEqual({ boxScoresThrough: '2026-11-12', fresh: true });
  const partial = await buildDashboard(db({ lastGame: '2026-10-31', fail: ['bankroll'] }), 'u1', {}, NOW);
  expect(partial.bankroll).toBeNull();
  expect(partial.edition).toMatchObject({ sealed: false, reason: 'data_stale' });
  expect((await buildDashboard(db({}), 'new-user', {}, NOW)).bankroll).toEqual({ started: false, pendingTickets: 0 });
});
