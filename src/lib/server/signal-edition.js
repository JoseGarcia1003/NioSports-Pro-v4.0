// Builds and seals the daily NBA signal edition. Used by the scheduled job (so
// an edition exists every game day without anyone opening the page) and, as a
// fallback, by the first member who opens Señales. Never publishes on stale
// statistics or without sportsbook lines; never after the games have started.
import { loadBoard, dayFor } from './nba-props.js';
import { getNbaTotals, getNbaPlayerPoints, supabaseStore } from './odds-cache.js';
import { buildSignals, SIGNAL_METHOD } from '$lib/nba/signals.js';
import { MODEL } from '$lib/models/nba-points.js';
import { appendSeal, anchorSeal } from './seals.js';
import { freshness } from '$lib/sports/core/freshness.js';
import { SPORTS_CONFIG } from '$lib/sports/config.js';

export async function readEdition(db, day) {
  const { data } = await db.from('nba_signal_editions').select('day, sealed_at, method, entries').eq('day', day).maybeSingle();
  return data ? { day: data.day, sealedAt: data.sealed_at, method: data.method, entries: data.entries } : null;
}

/** @returns {{ day: string, edition: object|null, reason: string|null, created: boolean }} */
export async function ensureEdition(db, env, { now = Date.now() } = {}) {
  const day = dayFor(0, now);
  let edition = await readEdition(db, day);
  if (edition) return { day, edition, reason: null, created: false };
  try {
    const store = supabaseStore(db);
    const apiKey = env.ODDS_API_KEY || '';
    const totals = await getNbaTotals({ store, apiKey });
    const market = totals.ok ? await getNbaPlayerPoints({ store, apiKey, events: totals.events, quotaHint: totals.quotaRemaining }) : totals;
    if (!market.ok || !market.players || !Object.keys(market.players).length) return { day, edition: null, reason: 'lines_unavailable', created: false };
    const board = await loadBoard(db, env.BALLDONTLIE_API_KEY, 0);
    if (!board.games.some(g => Date.parse(g.datetime) > now)) return { day, edition: null, reason: 'no_upcoming_games', created: false };
    const boxScoresThrough = board.players.reduce((m, p) => (p.games?.[0]?.[0] > m ? p.games[0][0] : m), '');
    if (!freshness(SPORTS_CONFIG.nba.freshness.boxScores, boxScoresThrough, day).usable) return { day, edition: null, reason: 'data_stale', created: false };
    const entries = buildSignals({ players: board.players, market: market.players, games: board.games, defense: board.defense, now });
    await db.from('nba_signal_editions').upsert({ day, method: SIGNAL_METHOD, entries }, { onConflict: 'day', ignoreDuplicates: true });
    edition = await readEdition(db, day);
    if (edition) await sealEdition(db, edition, board.games, { boxScoresThrough, linesFetchedAt: market.fetchedAt ?? null }, now);
    return { day, edition, reason: edition ? null : 'unavailable', created: !!edition };
  } catch (e) {
    console.error('[edition]', e?.message);
    return { day, edition: null, reason: 'unavailable', created: false };
  }
}

// Commits the stored edition to the public hash chain and asks OpenTimestamps to
// anchor it. Failures never block the signals; the daily job retries anchoring.
async function sealEdition(db, edition, games, dataAsOf, now) {
  try {
    const tips = games.map(g => Date.parse(g.datetime)).filter(t => t > now);
    const entryTips = edition.entries.map(e => Date.parse(e.tipoff)).filter(Number.isFinite);
    const pool = entryTips.length ? entryTips : tips;
    const first = Math.min(...pool), last = Math.max(...pool);
    if (!Number.isFinite(first) || first <= now) return;
    const { row, created } = await appendSeal(db, {
      editionKey: `nba:points:${edition.day}`, sport: 'nba', market: 'points', day: edition.day,
      firstEventAt: new Date(first).toISOString(), revealAfter: new Date(last).toISOString(),
      model: { id: MODEL.id, version: MODEL.version, method: edition.method }, dataAsOf, entries: edition.entries
    });
    if (created) await anchorSeal(db, row.hash, { timeoutMs: 4000 });
  } catch (e) { console.error('[edition] seal failed', e?.message); }
}
