// Server side of the sealed ledger: append (with one retry on a concurrent
// writer), external anchoring, and the public, commit-reveal read model.
import { makeSeal, GENESIS } from '$lib/integrity/seal.js';
import { stampDigest, CALENDARS } from './opentimestamps.js';

export const CALENDAR_SET = new Set(CALENDARS);

const COLUMNS = 'seq, edition_key, sport, market, day, sealed_at, first_event_at, reveal_after, model_id, model_version, entry_count, hash, prev_hash, backfilled';

export async function latestHash(db) {
  const { data, error } = await db.from('prediction_seals').select('hash').order('seq', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error('seal_read_failed');
  return data?.hash || GENESIS;
}

/**
 * Seals one edition. `fields` are sealText fields without prevHash/sealedAt.
 * Returns the stored row, or the existing one if this edition was already sealed.
 */
export async function appendSeal(db, fields, { now = () => new Date(), backfilled = false } = {}) {
  const existing = await db.from('prediction_seals').select(COLUMNS).eq('edition_key', fields.editionKey).maybeSingle();
  if (existing.data) return { row: existing.data, created: false };
  for (let attempt = 0; attempt < 3; attempt++) {
    const prevHash = await latestHash(db);
    const sealedAt = fields.sealedAt && backfilled ? fields.sealedAt : now().toISOString();
    const { text, hash } = await makeSeal({ ...fields, sealedAt, prevHash });
    const { data, error } = await db.from('prediction_seals').insert({
      edition_key: fields.editionKey, sport: fields.sport, market: fields.market, day: fields.day,
      first_event_at: fields.firstEventAt, reveal_after: fields.revealAfter, model_id: fields.model.id, model_version: fields.model.version,
      entry_count: fields.entries.length, payload_text: text, hash, prev_hash: prevHash, backfilled
    }).select(COLUMNS).single();
    if (!error) return { row: data, created: true };
    const msg = `${error.message || ''} ${error.code || ''}`;
    if (/duplicate key|23505/.test(msg)) {
      const again = await db.from('prediction_seals').select(COLUMNS).eq('edition_key', fields.editionKey).maybeSingle();
      if (again.data) return { row: again.data, created: false };
    }
    if (!/seal_chain_conflict/.test(msg)) throw new Error(`seal_insert_failed: ${error.message || error.code}`);
  }
  throw new Error('seal_chain_contended');
}

/** Requests OpenTimestamps proofs for a hash and stores those obtained. */
export async function anchorSeal(db, hash, opts) {
  const results = await stampDigest(hash, opts);
  let stored = 0;
  for (const r of results.filter(x => x.ok)) {
    const { error } = await db.from('prediction_seal_anchors').insert({ seal_hash: hash, kind: 'opentimestamps', calendar: r.calendar, proof: `\\x${Buffer.from(r.proof).toString('hex')}` });
    if (!error) stored++;
  }
  return { requested: results.length, stored, failures: results.filter(x => !x.ok).map(x => ({ calendar: x.calendar, error: x.error })) };
}

/** Seals still lacking any anchor (retry job). */
export async function unanchored(db, limit = 20) {
  const { data: seals } = await db.from('prediction_seals').select('hash, seq').order('seq', { ascending: false }).limit(200);
  const { data: anchors } = await db.from('prediction_seal_anchors').select('seal_hash');
  const have = new Set((anchors || []).map(a => a.seal_hash));
  return (seals || []).filter(s => !have.has(s.hash)).slice(0, limit).map(s => s.hash);
}

const toPublic = (row, now) => {
  const revealed = Date.parse(row.reveal_after) <= now;
  return { seq: Number(row.seq), editionKey: row.edition_key, sport: row.sport, market: row.market, day: row.day, sealedAt: row.sealed_at,
    firstEventAt: row.first_event_at, revealAfter: row.reveal_after, model: `${row.model_id}@${row.model_version}`, entryCount: row.entry_count,
    hash: row.hash, prevHash: row.prev_hash, backfilled: row.backfilled, revealed, text: revealed ? row.payload_text ?? null : null };
};

/** Public ledger: hashes always; content only after reveal_after (commit-reveal). */
export async function publicLedger(db, { limit = 60, before = null, now = Date.now() } = {}) {
  let q = db.from('prediction_seals').select(`${COLUMNS}, payload_text`).order('seq', { ascending: false }).limit(Math.min(200, limit));
  if (before) q = q.lt('seq', before);
  const { data, error } = await q;
  if (error) throw new Error('ledger_unavailable');
  const rows = (data || []).map(r => toPublic(r, now));
  const hashes = rows.map(r => r.hash);
  const { data: anchors } = hashes.length ? await db.from('prediction_seal_anchors').select('seal_hash, calendar, created_at').in('seal_hash', hashes) : { data: [] };
  const by = new Map();
  for (const a of anchors || []) (by.get(a.seal_hash) || by.set(a.seal_hash, []).get(a.seal_hash)).push({ calendar: a.calendar, createdAt: a.created_at });
  return rows.map(r => ({ ...r, anchors: by.get(r.hash) || [] }));
}

export async function anchorProof(db, hash, calendar) {
  const { data } = await db.from('prediction_seal_anchors').select('proof').eq('seal_hash', hash).eq('calendar', calendar).maybeSingle();
  if (!data?.proof) return null;
  const p = data.proof;
  return typeof p === 'string' && p.startsWith('\\x') ? Buffer.from(p.slice(2), 'hex') : Buffer.from(p);
}
