import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { loadBoard, dayFor } from '$lib/server/nba-props.js';
import { getNbaTotals, getNbaPlayerPoints, supabaseStore } from '$lib/server/odds-cache.js';
import { buildSignals, settle, summarize, SIGNAL_METHOD } from '$lib/nba/signals.js';

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
        if (!upcoming) reason = 'no_upcoming_games';
        else {
          const entries = buildSignals({ players: board.players, market: market.players, games: board.games, defense: board.defense });
          await db.from('nba_signal_editions').upsert({ day, method: SIGNAL_METHOD, entries }, { onConflict: 'day', ignoreDuplicates: true });
          edition = await readEdition(db, day);
        }
      }
    } catch { reason = 'unavailable'; }
  }

  const history = await settledHistory(db, day);
  return json({ day, edition, reason, history }, { headers: { 'Cache-Control': 'no-store' } });
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
