// Sealed prediction ledger: each record is canonical JSON whose SHA-256 is its
// identity, and which names the previous record's hash (a hash chain). Altering
// any past record changes its hash and breaks every later link. Runs unchanged
// in the browser (public verification page) and on the server.
import { canonicalize } from './canonical.js';

export const SEAL_SCHEMA = 'niosports.seal/v1';
export const GENESIS = '0'.repeat(64);
const HEX = /^[0-9a-f]{64}$/;

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Web Crypto is unavailable');
  return s;
};
export const toHex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
export function fromHex(hex) {
  if (!/^([0-9a-f]{2})*$/i.test(hex)) throw new TypeError('Invalid hex');
  return Uint8Array.from(hex.match(/../g) || [], h => parseInt(h, 16));
}

/** SHA-256 of a UTF-8 string, lowercase hex. */
export async function sha256Hex(text) {
  return toHex(await subtle().digest('SHA-256', new TextEncoder().encode(text)));
}

/**
 * Builds the exact text that is hashed and stored. Every field is required so a
 * record can never be ambiguous about what, when and with which model.
 */
export function sealText({ editionKey, sport, market, day, sealedAt, firstEventAt, revealAfter, model, dataAsOf, entries, prevHash }) {
  if (!HEX.test(prevHash || '')) throw new TypeError('prevHash must be 64 hex characters');
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  for (const [k, v] of Object.entries({ editionKey, sport, market, day, sealedAt, firstEventAt, revealAfter })) {
    if (typeof v !== 'string' || !v) throw new TypeError(`${k} is required`);
  }
  if (!model?.id || !model?.version) throw new TypeError('model id and version are required');
  if (Date.parse(firstEventAt) <= Date.parse(sealedAt)) throw new RangeError('A seal must precede the first event');
  if (Date.parse(revealAfter) < Date.parse(firstEventAt)) throw new RangeError('Reveal cannot precede the first event');
  return canonicalize({ schema: SEAL_SCHEMA, editionKey, sport, market, day, sealedAt, firstEventAt, revealAfter, model, dataAsOf: dataAsOf ?? null, entries, prevHash });
}

export async function makeSeal(fields) {
  const text = sealText(fields);
  return { text, hash: await sha256Hex(text) };
}

/**
 * Verifies a ledger slice ordered by seq ascending. Each record: {seq, hash,
 * prevHash, text|null}. Text may be withheld until reveal; the chain of hashes is
 * still checked. Returns one verdict per record plus the overall result.
 */
export async function verifyChain(records, { startPrev = null } = {}) {
  const out = [];
  let expectedPrev = startPrev;
  for (const r of records) {
    const problems = [];
    if (!HEX.test(r.hash || '')) problems.push('hash_format');
    if (expectedPrev !== null && r.prevHash !== expectedPrev) problems.push('chain_break');
    let content = 'withheld';
    if (typeof r.text === 'string') {
      const actual = await sha256Hex(r.text);
      if (actual !== r.hash) problems.push('hash_mismatch');
      let parsed = null;
      try { parsed = JSON.parse(r.text); } catch { problems.push('not_json'); }
      if (parsed) {
        if (parsed.prevHash !== r.prevHash) problems.push('declared_prev_mismatch');
        if (canonicalize(parsed) !== r.text) problems.push('not_canonical');
      }
      content = 'verified';
    }
    out.push({ seq: r.seq, hash: r.hash, ok: problems.length === 0, content, problems });
    expectedPrev = r.hash;
  }
  return { ok: out.every(x => x.ok), records: out };
}
