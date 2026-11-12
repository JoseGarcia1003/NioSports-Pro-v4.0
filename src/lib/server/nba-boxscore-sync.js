// Server-side ingestion of NBA box scores (no owner PC involved). Finds games
// that should exist but are missing from nba_player_games, fetches each finished
// game from the NBA public CDN, validates every row with the same rules as the
// manual ingest, and stores whole games only. Idempotent and resumable: a run
// that stops early simply continues on the next one.
import { nbaCdn } from '$lib/sports/providers/nba-cdn.js';
import { validateRow } from './nba-ingest.js';
import { recordRun } from './sync.js';
import { rateLimiter } from '$lib/sports/core/http.js';

const LOOKBACK_DAYS = 21;
const MIN_ROWS_PER_GAME = 10;
const addDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

/** Game ids to fetch: scheduled within the window, not later than today, not yet stored. */
export function missingGames(schedule, stored, { from, to }) {
  return schedule.filter(g => g.day >= from && g.day <= to && (stored.get(g.id) || 0) < MIN_ROWS_PER_GAME)
    .sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id));
}

export async function syncNbaBoxScores(db, { today, trigger = 'cron', fetchImpl = fetch, budgetMs = 40000, maxGames = 60, now = () => Date.now(), provider = nbaCdn } = {}) {
  const started = now(), startedIso = new Date(started).toISOString();
  const limiter = rateLimiter(provider.limits);
  const opts = { fetchImpl, limiter, log: () => {} };
  const finish = async run => { await recordRun(db, { sport: 'nba', kind: 'boxscores', provider: provider.id, trigger, started_at: startedIso, ...run }); return run; };
  try {
    const { data: last, error: e1 } = await db.from('nba_player_games').select('game_date').order('game_date', { ascending: false }).limit(1).maybeSingle();
    if (e1) throw Object.assign(new Error('db'), { code: 'database_read' });
    const from = last?.game_date && last.game_date > addDays(today, -LOOKBACK_DAYS) ? addDays(last.game_date, -1) : addDays(today, -LOOKBACK_DAYS);

    // Season schedule first; today's scoreboard covers the case where it is unavailable.
    let schedule = [], sources = [];
    try { schedule = await provider.schedule(opts); sources.push('schedule'); } catch (e) { sources.push(`schedule_failed:${e?.code || 'error'}`); }
    if (!schedule.length) { schedule = await provider.scoreboard(opts); sources.push('scoreboard'); }

    // Aggregated in the database: one row per game, well under the API row cap.
    const { data: have, error: e2 } = await db.rpc('nba_stored_games', { p_from: from });
    if (e2) throw Object.assign(new Error('db'), { code: 'database_read' });
    const stored = new Map((have || []).map(r => [r.game_id, Number(r.n)]));

    const todo = missingGames(schedule, stored, { from, to: today }).slice(0, maxGames);
    let rowsIn = 0, rowsValid = 0, rowsRejected = 0, gamesStored = 0, asOf = null;
    const notFinal = [], rejected = [], failed = [];
    for (const g of todo) {
      if (now() - started > budgetMs) break;
      let box;
      try { box = await provider.boxScore(g.id, { ...opts, day: g.day }); }
      catch (e) { if (g.day < today) failed.push({ id: g.id, error: e?.code || 'error' }); continue; }
      if (!box.final) { notFinal.push(g.id); continue; }
      rowsIn += box.rows.length;
      const bad = box.rows.map(validateRow).filter(x => x.length);
      // A game is stored whole or not at all.
      if (bad.length || box.rows.length < MIN_ROWS_PER_GAME) { rowsRejected += box.rows.length; rejected.push({ id: g.id, issues: bad.slice(0, 2), rows: box.rows.length }); continue; }
      const stamp = new Date(now()).toISOString();
      const { error } = await db.from('nba_player_games').upsert(box.rows.map(r => ({ ...r, ingested_at: stamp })), { onConflict: 'game_id,player_id' });
      if (error) { failed.push({ id: g.id, error: 'database_write' }); continue; }
      rowsValid += box.rows.length; gamesStored++;
      if (!asOf || box.day > asOf) asOf = box.day;
    }
    const pendingPast = failed.length + rejected.length;
    const status = pendingPast ? (gamesStored ? 'partial' : 'failed') : 'ok';
    return finish({ status, records_in: rowsIn, records_valid: rowsValid, records_rejected: rowsRejected, data_as_of: asOf ?? last?.game_date ?? null,
      error_code: status === 'failed' ? String(failed[0]?.error || 'rows_rejected').slice(0, 80) : null,
      details: { sources, window: { from, to: today }, candidates: todo.length, gamesStored, notFinal: notFinal.length, rejected: rejected.slice(0, 5), failed: failed.slice(0, 5) } });
  } catch (e) {
    return finish({ status: 'failed', error_code: String(e?.code || 'error').replace(/[^a-z0-9_:-]/g, '_').slice(0, 80), details: {} });
  }
}
