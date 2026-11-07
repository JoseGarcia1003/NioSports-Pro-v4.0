import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { loadBoard, dayFor } from '$lib/server/nba-props.js';
import { getNbaTotals, getNbaPlayerPoints, supabaseStore } from '$lib/server/odds-cache.js';
import { buildSignals, settle, summarize, SIGNAL_METHOD } from '$lib/nba/signals.js';
import { MODEL } from '$lib/models/nba-points.js';
import { appendSeal, anchorSeal } from '$lib/server/seals.js';
import { freshness } from '$lib/sports/core/freshness.js';
import { SPORTS_CONFIG } from '$lib/sports/config.js';

const HISTORY_DAYS = 30;

// Seals today's edition once (immutable table) when sportsbook lines exist,
// then returns it with the settled history of previous editions.
export async function GET({ request }) {
  await requireIdentity(request);
  const db = adminDatabase();
  const day = dayFor(0);

  let edition = await readEdition(db, day);
  let reason = null;
  if (!edition) {
    try {
      const store = supabaseStore(db);
      const apiKey = env.ODDS_API_KEY || '';
      const totals = await getNbaTotals({ store, apiKey });
      const market = totals.ok ? await getNbaPlayerPoints({ store, apiKey, events: totals.events, quotaHint: totals.quotaRemaining }) : totals;
      if (!market.ok || !market.players || !Object.keys(market.players).length) reason = 'lines_unavailable';
      else {
        const board = await loadBoard(db, env.BALLDONTLIE_API_KEY, 0);
        const upcoming = board.games.some(g => Date.parse(g.datetime) > Date.now());
        const boxScoresThrough = board.players.reduce((m, p) => (p.games?.[0]?.[0] > m ? p.games[0][0] : m), '');
        const fresh = freshness(SPORTS_CONFIG.nba.freshness.boxScores, boxScoresThrough, day);
        if (!upcoming) reason = 'no_upcoming_games';
        // Never publish model output built on stale statistics.
        else if (!fresh.usable) reason = 'data_stale';
        else {
          const entries = buildSignals({ players: board.players, market: market.players, games: board.games, defense: board.defense });
          await db.from('nba_signal_editions').upsert({ day, method: SIGNAL_METHOD, entries }, { onConflict: 'day', ignoreDuplicates: true });
          edition = await readEdition(db, day);
          if (edition) await sealEdition(db, edition, board.games, { boxScoresThrough, linesFetchedAt: market.fetchedAt ?? null });
        }
      }
    } catch { reason = 'unavailable'; }
  }

  const history = await settledHistory(db, day);
  const seal = edition ? await sealFor(db, day) : null;
  return json({ day, edition, reason, history, seal }, { headers: { 'Cache-Control': 'no-store' } });
}

// Commits the stored edition to the public hash chain and asks OpenTimestamps to
// anchor it. Failures never block the signals; the ops job retries anchoring.
async function sealEdition(db, edition, games, dataAsOf) {
  try {
    const tips = games.map(g => Date.parse(g.datetime)).filter(t => t > Date.now());
    const entryTips = edition.entries.map(e => Date.parse(e.tipoff)).filter(Number.isFinite);
    const first = Math.min(...(entryTips.length ? entryTips : tips)), last = Math.max(...(entryTips.length ? entryTips : tips));
    if (!Number.isFinite(first) || first <= Date.now()) return;
    const { row, created } = await appendSeal(db, {
      editionKey: `nba:points:${edition.day}`, sport: 'nba', market: 'points', day: edition.day,
      firstEventAt: new Date(first).toISOString(), revealAfter: new Date(last).toISOString(),
      model: { id: MODEL.id, version: MODEL.version, method: edition.method }, dataAsOf, entries: edition.entries
    });
    if (created) await anchorSeal(db, row.hash, { timeoutMs: 4000 });
  } catch (e) { console.error('[signals] seal failed', e?.message); }
}

async function sealFor(db, day) {
  const { data } = await db.from('prediction_seals').select('seq, hash, sealed_at, reveal_after').eq('edition_key', `nba:points:${day}`).maybeSingle();
  return data ? { seq: Number(data.seq), hash: data.hash, sealedAt: data.sealed_at, revealAfter: data.reveal_after } : null;
}

async function readEdition(db, day) {
  const { data } = await db.from('nba_signal_editions').select('day, sealed_at, method, entries').eq('day', day).maybeSingle();
  return data ? { day: data.day, sealedAt: data.sealed_at, method: data.method, entries: data.entries } : null;
}

async function settledHistory(db, today) {
  const since = new Date(Date.parse(`${today}T12:00:00Z`) - HISTORY_DAYS * 86400000).toISOString().slice(0, 10);
  const { data: editions } = await db.from('nba_signal_editions').select('day, sealed_at, entries').lt('day', today).gte('day', since).order('day', { ascending: false });
  const list = editions || [];
  const ids = [...new Set(list.flatMap(e => e.entries.map(x => x.playerId)))];
  let rows = [];
  if (ids.length) {
    const { data } = await db.from('nba_player_games').select('player_id, game_date, pts, minutes').in('player_id', ids).gte('game_date', since).lt('game_date', today);
    rows = data || [];
  }
  const box = new Map(rows.map(r => [`${r.player_id}:${r.game_date}`, { pts: r.pts, minutes: Number(r.minutes) }]));
  const days = list.map(e => ({ day: e.day, sealedAt: e.sealed_at, entries: e.entries.map(x => ({ ...x, result: settle(x, box.get(`${x.playerId}:${e.day}`)) })) }));
  return { days, summary: summarize(days.flatMap(d => d.entries.map(x => x.result))) };
}
