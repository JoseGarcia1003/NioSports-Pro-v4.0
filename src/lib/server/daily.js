// The daily pipeline, shared by the scheduled job and the owner's "sync now"
// button. Steps are independent: each has its own deadline and its own record
// in ingest_runs, so a provider that hangs can neither stop nor starve the rest.
//   1. Schedules of the four sports and missing OpenTimestamps anchors (fast, in parallel).
//   2. NBA box scores from the public NBA CDN (results of finished games).
//   3. Today's signal edition: built, sealed and anchored before tip-off.
import { syncSchedule, recordRun } from './sync.js';
import { syncNbaBoxScores } from './nba-boxscore-sync.js';
import { ensureEdition } from './signal-edition.js';
import { anchorSeal, unanchored } from './seals.js';
import { supabaseStore } from './odds-cache.js';
import { dayFor } from './nba-props.js';
import { SPORT_IDS } from '$lib/sports/config.js';

/** Resolves with `fallback` if the step is still running after `ms`. */
export function withDeadline(promise, ms, fallback) {
  let timer;
  return Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve(fallback), ms); })]).finally(() => clearTimeout(timer));
}

async function anchorsStep(db, trigger) {
  const startedAt = new Date().toISOString();
  const pending = await unanchored(db, 6);
  let stored = 0;
  for (const hash of pending) stored += (await anchorSeal(db, hash, { timeoutMs: 3000 })).stored;
  await recordRun(db, { sport: 'nba', kind: 'anchors', provider: 'opentimestamps', trigger, status: pending.length && !stored ? 'failed' : 'ok', started_at: startedAt,
    records_in: pending.length, records_valid: Math.min(stored, pending.length), error_code: pending.length && !stored ? 'no_calendar_answered' : null });
  return { pending: pending.length, stored };
}

export async function runDaily(db, env, { trigger = 'cron', boxScoreBudgetMs = 25000, sync = syncNbaBoxScores, edition = ensureEdition } = {}) {
  const startedAt = Date.now();
  const store = supabaseStore(db);
  const utcDay = new Date().toISOString().slice(0, 10);
  const TIMED_OUT = { status: 'failed', error: 'deadline_exceeded' };
  const safe = (promise, ms) => withDeadline(promise.catch(() => ({ status: 'failed' })), ms, TIMED_OUT);

  const schedules = Promise.all(SPORT_IDS.map(async sport => {
    const r = await safe(syncSchedule(db, { sport, day: utcDay, env, store, trigger, timeoutMs: 6000, retries: 1 }).then(x => ({ status: x.status, events: x.events.length })), 16000);
    return [sport, r];
  })).then(Object.fromEntries);
  const anchors = safe(anchorsStep(db, trigger), 20000);
  const boxScores = safe(sync(db, { today: dayFor(0), trigger, budgetMs: boxScoreBudgetMs }).then(r => (
    { status: r.status, rows: r.records_valid ?? 0, games: r.details?.gamesStored ?? 0, through: r.data_as_of ?? null, error: r.error_code ?? null })), boxScoreBudgetMs + 3000);

  const steps = { schedules: await schedules, anchors: await anchors, boxScores: await boxScores };
  // The edition needs the freshest box scores, so it runs after them, with what is left of ~50 s.
  const left = Math.max(4000, 50000 - (Date.now() - startedAt));
  steps.edition = await withDeadline(edition(db, env).then(e => ({ day: e.day, sealed: !!e.edition, created: e.created, entries: e.edition?.entries?.length ?? 0, reason: e.reason }))
    .catch(() => ({ sealed: false, reason: 'unavailable' })), left, { sealed: false, reason: 'deadline_exceeded' });
  return { ranAt: new Date(startedAt).toISOString(), ms: Date.now() - startedAt, steps };
}
