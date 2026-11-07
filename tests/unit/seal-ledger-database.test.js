// @vitest-environment node
import { beforeAll, afterAll, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { makeSeal, GENESIS } from '../../src/lib/integrity/seal.js';

let db;
beforeAll(async () => {
  db = new PGlite();
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;alter default privileges grant all on tables to service_role;');
  await db.exec(readFileSync('supabase/migrations/20261107014907_prediction_seal_ledger.sql', 'utf8'));
}, 30000);
afterAll(() => db?.close());

const iso = ms => new Date(ms).toISOString();
async function sealFor(day, prevHash, overrides = {}) {
  const now = Date.now();
  const fields = { editionKey: `nba:points:${day}`, sport: 'nba', market: 'points', day, sealedAt: iso(now), firstEventAt: iso(now + 3600e3), revealAfter: iso(now + 7200e3),
    model: { id: 'nba-points', version: '1.0.0' }, dataAsOf: null, entries: [{ a: 1 }], prevHash, ...overrides };
  return { fields, ...(await makeSeal(fields)) };
}
const insert = (s, extra = {}) => db.query(
  'insert into prediction_seals(edition_key,sport,market,day,first_event_at,reveal_after,model_id,model_version,entry_count,payload_text,hash,prev_hash,backfilled) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning seq',
  [s.fields.editionKey, s.fields.sport, s.fields.market, s.fields.day, s.fields.firstEventAt, s.fields.revealAfter, s.fields.model.id, s.fields.model.version, s.fields.entries.length, extra.text ?? s.text, extra.hash ?? s.hash, s.fields.prevHash, extra.backfilled ?? false]);

it('accepts a valid genesis seal and links the next one', async () => {
  const a = await sealFor('2026-11-07', GENESIS);
  expect((await insert(a)).rows[0].seq).toBe(1);
  const b = await sealFor('2026-11-08', a.hash);
  expect((await insert(b)).rows[0].seq).toBe(2);
});
it('rejects a wrong predecessor (forked chain)', async () => {
  const c = await sealFor('2026-11-09', GENESIS);
  await expect(insert(c)).rejects.toThrow(/seal_chain_conflict/);
});
it('rejects a hash that does not match the stored text', async () => {
  const last = (await db.query('select hash from prediction_seals order by seq desc limit 1')).rows[0].hash;
  const d = await sealFor('2026-11-10', last);
  await expect(insert(d, { text: d.text.replace('"a":1', '"a":2') })).rejects.toThrow(/seal_hash_mismatch/);
});
it('rejects columns that disagree with the sealed payload', async () => {
  const last = (await db.query('select hash from prediction_seals order by seq desc limit 1')).rows[0].hash;
  const e = await sealFor('2026-11-11', last);
  e.fields = { ...e.fields, market: 'rebounds' };
  await expect(insert(e)).rejects.toThrow(/seal_columns_disagree/);
});
it('rejects a live seal created after its first event or with a false clock', async () => {
  const last = (await db.query('select hash from prediction_seals order by seq desc limit 1')).rows[0].hash;
  const now = Date.now();
  // sealText itself refuses sealedAt >= firstEventAt, so forge a payload that lies about sealedAt.
  const f = await sealFor('2026-11-12', last, { sealedAt: iso(now - 7200e3), firstEventAt: iso(now - 3600e3), revealAfter: iso(now) });
  await expect(insert(f)).rejects.toThrow(/seal_clock_skew|seal_after_first_event/);
  const g = await sealFor('2026-11-12', last, { sealedAt: iso(now - 7200e3), firstEventAt: iso(now + 3600e3), revealAfter: iso(now + 7200e3) });
  await expect(insert(g)).rejects.toThrow(/seal_clock_skew/);
});
it('allows explicitly backfilled historical seals (marked as such)', async () => {
  const last = (await db.query('select hash from prediction_seals order by seq desc limit 1')).rows[0].hash;
  const now = Date.now();
  const h = await sealFor('2026-11-02', last, { sealedAt: iso(now - 9e8), firstEventAt: iso(now - 8e8), revealAfter: iso(now - 7e8) });
  h.fields.editionKey = 'nba:points:2026-11-02';
  expect((await insert(h, { backfilled: true })).rows[0].seq).toBe(3);
});
it('is append-only for everyone, including the service role', async () => {
  await expect(db.exec("update prediction_seals set market='x'")).rejects.toThrow();
  await expect(db.exec('delete from prediction_seals')).rejects.toThrow();
  await expect(db.exec('truncate prediction_seals cascade')).rejects.toThrow();
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    try { await expect(db.exec('select * from prediction_seals')).rejects.toThrow(); } finally { await db.exec('reset role'); }
  }
  await db.exec('set role service_role');
  try { await expect(db.exec('delete from prediction_seals')).rejects.toThrow(); } finally { await db.exec('reset role'); }
});
it('anchors are append-only and bound to an existing seal', async () => {
  const first = (await db.query('select hash from prediction_seals where seq=1')).rows[0].hash;
  await db.query("insert into prediction_seal_anchors(seal_hash,kind,calendar,proof) values($1,'opentimestamps','https://a',$2)", [first, new Uint8Array(80)]);
  await expect(db.query("insert into prediction_seal_anchors(seal_hash,kind,calendar,proof) values($1,'opentimestamps','https://a',$2)", ['f'.repeat(64), new Uint8Array(80)])).rejects.toThrow();
  await expect(db.exec('delete from prediction_seal_anchors')).rejects.toThrow();
});
