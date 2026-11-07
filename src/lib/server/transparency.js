import { adminDatabase } from './entitlements.js';
import { publicLedger } from './seals.js';
import { settledEntries, trackRecord } from '$lib/stats/transparency.js';

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
  const players = new Set(), days = new Set();
  for (const s of revealed) { const d = JSON.parse(s.text); days.add(d.day); for (const e of d.entries) if (e.playerId) players.add(e.playerId); }
  const box = new Map();
  if (players.size) {
    const { data, error } = await db.from('nba_player_games').select('player_id, game_date, pts, minutes').in('player_id', [...players]).in('game_date', [...days]);
    if (error) throw new Error('box_scores_unavailable');
    for (const r of data || []) box.set(`${r.player_id}:${r.game_date}`, { pts: r.pts, minutes: Number(r.minutes) });
  }
  const rows = revealed.flatMap(s => settledEntries(s, (e, day) => box.get(`${e.playerId}:${day}`)));
  return { generatedAt: new Date(now).toISOString(), seals: ledger.length, revealedSeals: revealed.length, hiddenSeals: ledger.length - revealed.length, ...trackRecord(rows) };
}
