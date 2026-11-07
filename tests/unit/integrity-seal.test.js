// @vitest-environment node
import { it, expect, describe } from 'vitest';
import { createHash } from 'node:crypto';
import { canonicalize } from '../../src/lib/integrity/canonical.js';
import { makeSeal, sealText, verifyChain, sha256Hex, GENESIS } from '../../src/lib/integrity/seal.js';
import { otsFile, stampDigest } from '../../src/lib/server/opentimestamps.js';

const base = { editionKey: 'nba:points:2026-11-07', sport: 'nba', market: 'points', day: '2026-11-07', sealedAt: '2026-11-07T15:00:00.000Z',
  firstEventAt: '2026-11-08T00:00:00.000Z', revealAfter: '2026-11-08T03:00:00.000Z', model: { id: 'nba-points', version: '1.0.0' }, dataAsOf: { boxScores: '2026-11-06' },
  entries: [{ playerId: 1, side: 'over', line: 24.5, p: 0.61 }], prevHash: GENESIS };

describe('canonical JSON', () => {
  it('sorts keys, drops undefined and is stable', () => {
    expect(canonicalize({ b: 1, a: [true, null, 'x'], c: undefined })).toBe('{"a":[true,null,"x"],"b":1}');
    expect(canonicalize({ z: { y: 1, x: 2 } })).toBe(canonicalize({ z: { x: 2, y: 1 } }));
    expect(canonicalize(-0)).toBe('0');
  });
  it('refuses values that have no single JSON form', () => {
    expect(() => canonicalize(NaN)).toThrow(); expect(() => canonicalize(new Date())).toThrow(); expect(() => canonicalize(() => 1)).toThrow();
  });
});

describe('seals', () => {
  it('hash equals SHA-256 of the exact canonical text (independent implementation)', async () => {
    const { text, hash } = await makeSeal(base);
    expect(hash).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    expect(JSON.parse(text).schema).toBe('niosports.seal/v1');
  });
  it('refuses a seal that does not precede its first event', () => {
    expect(() => sealText({ ...base, firstEventAt: base.sealedAt })).toThrow(/precede/);
    expect(() => sealText({ ...base, prevHash: 'x' })).toThrow();
    expect(() => sealText({ ...base, model: { id: 'm' } })).toThrow();
  });
  it('detects tampering, chain breaks and withheld content', async () => {
    const a = await makeSeal(base);
    const b = await makeSeal({ ...base, editionKey: 'nba:points:2026-11-08', day: '2026-11-08', prevHash: a.hash });
    const ok = await verifyChain([{ seq: 1, hash: a.hash, prevHash: GENESIS, text: a.text }, { seq: 2, hash: b.hash, prevHash: a.hash, text: null }], { startPrev: GENESIS });
    expect(ok.ok).toBe(true); expect(ok.records[1].content).toBe('withheld');
    const forged = a.text.replace('0.61', '0.71');
    const bad = await verifyChain([{ seq: 1, hash: a.hash, prevHash: GENESIS, text: forged }]);
    expect(bad.records[0].problems).toContain('hash_mismatch');
    const broken = await verifyChain([{ seq: 1, hash: a.hash, prevHash: GENESIS, text: a.text }, { seq: 2, hash: b.hash, prevHash: GENESIS, text: b.text }]);
    expect(broken.records[1].problems).toEqual(expect.arrayContaining(['chain_break', 'declared_prev_mismatch']));
  });
});

describe('OpenTimestamps', () => {
  it('builds a detached .ots file with the standard header', async () => {
    const digest = await sha256Hex('x');
    const file = otsFile(digest, [0xf0, 0x10]);
    expect(Buffer.from(file.slice(0, 31)).toString('hex')).toBe('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294');
    expect(file[31]).toBe(1); expect(file[32]).toBe(0x08);
    expect(Buffer.from(file.slice(33, 65)).toString('hex')).toBe(digest);
  });
  it('posts raw digest bytes and never throws when calendars fail', async () => {
    const digest = await sha256Hex('y');
    const calls = [];
    const fetchImpl = async (url, init) => { calls.push([url, init.body.length]); if (url.includes('b.')) throw new Error('down'); return new Response(new Uint8Array([1, 2, 3])); };
    const res = await stampDigest(digest, { fetchImpl, calendars: ['https://a.example', 'https://b.example'] });
    expect(calls).toEqual([['https://a.example/digest', 32], ['https://b.example/digest', 32]]);
    expect(res.map(r => r.ok)).toEqual([true, false]);
  });
});
