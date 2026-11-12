import { adminDatabase } from './entitlements.js';
import { publicLedger } from './seals.js';
import { settledEntries, trackRecord } from '$lib/stats/transparency.js';
import { loadBoxScores } from './signal-results.js';

/** Builds the public record from every revealed seal and official box scores. */
export async function publicTrackRecord(db = adminDatabase(), now = Date.now()) {
  const ledger = [];
  let before = null;
  for (let page = 0; page < 20; page++) {
    const rows = await publicLedger(db, { limit: 200, before, now });
    ledger.push(...rows);
    if (rows.length < 200) break;
    before = rows[rows.length - 1].seq;
  }
  const revealed = ledger.filter(s => s.text);
  const docs = revealed.map(s => JSON.parse(s.text));
  const boxFor = await loadBoxScores(db, docs.map(d => [d.day, d.entries]));
  const rows = revealed.flatMap(s => settledEntries(s, boxFor));
  return { generatedAt: new Date(now).toISOString(), seals: ledger.length, revealedSeals: revealed.length, hiddenSeals: ledger.length - revealed.length, ...trackRecord(rows) };
}
