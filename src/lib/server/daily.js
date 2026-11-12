// The daily pipeline, shared by the scheduled job and the owner's "sync now"
// button. Each step is isolated (one failing provider never stops the rest)
// and leaves its own record in ingest_runs.
//   1. NBA box scores from the public NBA CDN (results of finished games).
//   2. Schedules of the four sports through their provider adapters.
//   3. Today's signal edition: built, sealed and anchored before tip-off.
//   4. OpenTimestamps anchors still missing.
import { syncSchedule, recordRun } from './sync.js';
import { syncNbaBoxScores } from './nba-boxscore-sync.js';
import { ensureEdition } from './signal-edition.js';
import { anchorSeal, unanchored } from './seals.js';
import { supabaseStore } from './odds-cache.js';
import { dayFor } from './nba-props.js';
import { SPORT_IDS } from '$lib/sports/config.js';

export async function runDaily(db, env, { trigger = 'cron', budgetMs = 45000 } = {}) {
  const startedAt = Date.now();
  const steps = {};
  const left = () => Math.max(3000, budgetMs - (Date.now() - startedAt));

  try {
    const r = await syncNbaBoxScores(db, { today: dayFor(0), trigger, budgetMs: Math.min(30000, left()) });
    steps.boxScores = { status: r.status, rows: r.records_valid ?? 0, games: r.details?.gamesStored ?? 0, through: r.data_as_of ?? null, error: r.error_code ?? null };
  } catch { steps.boxScores = { status: 'failed' }; }

  const store = supabaseStore(db);
  const utcDay = new Date().toISOString().slice(0, 10);
  steps.schedules = {};
  for (const sport of SPORT_IDS) {
    try { const r = await syncSchedule(db, { sport, day: utcDay, env, store, trigger }); steps.schedules[sport] = { status: r.status, events: r.events.length }; }
    catch { steps.schedules[sport] = { status: 'failed' }; }
  }

  try {
    const e = await ensureEdition(db, env);
    steps.edition = { day: e.day, sealed: !!e.edition, created: e.created, entries: e.edition?.entries?.length ?? 0, reason: e.reason };
  } catch { steps.edition = { sealed: false, reason: 'unavailable' }; }

  const anchorStart = new Date().toISOString();
  try {
    const pending = await unanchored(db, 10);
    let stored = 0;
    for (const hash of pending) { if (left() <= 3000) break; stored += (await anchorSeal(db, hash, { timeoutMs: 5000 })).stored; }
    steps.anchors = { pending: pending.length, stored };
    await recordRun(db, { sport: 'nba', kind: 'anchors', provider: 'opentimestamps', trigger, status: pending.length && !stored ? 'failed' : 'ok', started_at: anchorStart,
      records_in: pending.length, records_valid: Math.min(stored, pending.length), error_code: pending.length && !stored ? 'no_calendar_answered' : null });
  } catch { steps.anchors = { status: 'failed' }; }

  return { ranAt: new Date(startedAt).toISOString(), ms: Date.now() - startedAt, steps };
}
