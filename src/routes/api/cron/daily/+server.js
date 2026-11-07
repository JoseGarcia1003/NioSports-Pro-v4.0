// Daily orchestrator (Vercel cron, Bearer CRON_SECRET). Each step is isolated:
// one failing provider never stops the others, and every step leaves a record
// in ingest_runs. Steps: legacy NBA games table, multi-sport schedules,
// OpenTimestamps anchoring retries.
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { requireJobSecret } from '$lib/server/job-secret.js';
import { adminDatabase } from '$lib/server/entitlements.js';
import { syncSchedule, recordRun } from '$lib/server/sync.js';
import { anchorSeal, unanchored } from '$lib/server/seals.js';
import { supabaseStore } from '$lib/server/odds-cache.js';
import { SPORT_IDS } from '$lib/sports/config.js';
import { GET as legacyFetchGames } from '../fetch-games/+server.js';

export async function GET({ request }) {
  requireJobSecret(request);
  const db = adminDatabase();
  const day = new Date().toISOString().slice(0, 10);
  const steps = {};
  try { const r = await legacyFetchGames({ request }); steps.legacyGames = r.status; } catch { steps.legacyGames = 'failed'; }
  const store = supabaseStore(db);
  for (const sport of SPORT_IDS) {
    try { const r = await syncSchedule(db, { sport, day, env, store }); steps[sport] = { status: r.status, provider: r.provider, events: r.events.length }; }
    catch (e) { steps[sport] = { status: 'failed', error: e?.message?.slice(0, 80) }; }
  }
  const started = new Date().toISOString();
  try {
    const pending = await unanchored(db, 10);
    let stored = 0;
    for (const hash of pending) stored += (await anchorSeal(db, hash, { timeoutMs: 5000 })).stored;
    steps.anchors = { pending: pending.length, stored };
    await recordRun(db, { sport: 'nba', kind: 'anchors', provider: 'opentimestamps', trigger: 'cron', status: pending.length && !stored ? 'failed' : 'ok', started_at: started, records_in: pending.length, records_valid: stored, error_code: pending.length && !stored ? 'no_calendar_answered' : null });
  } catch { steps.anchors = 'failed'; }
  return json({ day, steps }, { headers: { 'Cache-Control': 'no-store' } });
}
