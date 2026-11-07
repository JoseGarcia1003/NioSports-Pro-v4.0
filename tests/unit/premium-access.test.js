// @vitest-environment node
import { it, expect } from 'vitest';
import { gateEdition, gatingEnabled } from '../../src/lib/server/access.js';

const edition = { day: '2026-11-08', entries: [{ name: 'A', line: 20.5, side: 'over', team: 'OKC' }, { name: 'B', line: 9.5, side: 'under', team: 'CLE', opponent: 'OKC', tipoff: 'x', stat: 'pts' }] };
it('keeps everything open while gating is disabled (beta)', () => {
  expect(gatingEnabled({})).toBe(false);
  expect(gateEdition(edition, { plan: 'free', enabled: false }).edition).toBe(edition);
});
it('free accounts get one full selection; the rest is redacted server-side', () => {
  const g = gateEdition(edition, { plan: 'free', enabled: true });
  expect(g.locked).toBe(1);
  expect(g.edition.entries[0]).toMatchObject({ name: 'A', freePick: true });
  expect(g.edition.entries[1]).toEqual({ locked: true, team: 'CLE', opponent: 'OKC', tipoff: 'x', stat: 'pts' });
  expect(JSON.stringify(g.edition.entries[1])).not.toMatch(/9\.5|under|"B"/);
});
it('paid plans see every selection', () => {
  for (const plan of ['pro', 'elite']) expect(gateEdition(edition, { plan, enabled: true }).locked).toBe(0);
});
