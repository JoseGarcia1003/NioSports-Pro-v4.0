// Independent anchoring through OpenTimestamps public calendars (free, no key).
// A calendar returns a proof that commits our SHA-256 to its aggregation tree,
// which it later anchors in a Bitcoin block. Once upgraded (with the standard
// `ots upgrade` tool or opentimestamps.org) the proof shows the hash existed no
// later than that block — evidence that does not depend on our database.
import { fromHex } from '$lib/integrity/seal.js';

export const CALENDARS = ['https://a.pool.opentimestamps.org', 'https://b.pool.opentimestamps.org', 'https://a.pool.eternitywall.com'];
// DetachedTimestampFile header (python-opentimestamps core/timestamp.py), major version 1, OpSHA256 tag 0x08.
const MAGIC = Uint8Array.from([0x00, ...new TextEncoder().encode('OpenTimestamps'), 0x00, 0x00, ...new TextEncoder().encode('Proof'), 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]);

/** Full `.ots` file bytes for a digest and the timestamp a calendar returned for it. */
export function otsFile(digestHex, calendarTimestamp) {
  const digest = fromHex(digestHex);
  if (digest.length !== 32) throw new TypeError('SHA-256 digest expected');
  const body = new Uint8Array(calendarTimestamp);
  const out = new Uint8Array(MAGIC.length + 2 + 32 + body.length);
  out.set(MAGIC, 0); out[MAGIC.length] = 0x01; out[MAGIC.length + 1] = 0x08;
  out.set(digest, MAGIC.length + 2); out.set(body, MAGIC.length + 34);
  return out;
}

/**
 * Submits a digest to each calendar; resolves with the proofs obtained (possibly
 * none). Never throws: anchoring is best effort and is retried by the ops job.
 */
export async function stampDigest(digestHex, { fetchImpl = fetch, calendars = CALENDARS, timeoutMs = 8000 } = {}) {
  const digest = fromHex(digestHex);
  const results = await Promise.all(calendars.map(async calendar => {
    try {
      const res = await fetchImpl(`${calendar}/digest`, {
        method: 'POST', body: digest,
        headers: { Accept: 'application/vnd.opentimestamps.v1', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'NioSportsPro-seal/1' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!res.ok) return { calendar, ok: false, error: `http_${res.status}` };
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (!bytes.length || bytes.length > 4096) return { calendar, ok: false, error: 'bad_body' };
      return { calendar, ok: true, proof: otsFile(digestHex, bytes) };
    } catch (e) { return { calendar, ok: false, error: e?.name === 'TimeoutError' ? 'timeout' : 'network' }; }
  }));
  return results;
}
