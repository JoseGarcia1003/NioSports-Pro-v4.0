// Synchronisation service: tries the configured providers for a sport/kind in
// order (failover), validates and de-duplicates what comes back, caches it with
// provenance and records every run in ingest_runs. Nothing is invented: a sport
// whose providers lack credentials records a 'skipped' run and serves nothing.
import { SPORTS_CONFIG } from '$lib/sports/config.js';
import { ADAPTERS, readiness } from '$lib/sports/providers/index.js';
import { partition, dedupe } from '$lib/sports/core/contracts.js';
import { rateLimiter } from '$lib/sports/core/http.js';

const limiters = new Map();
const limiterFor = a => {
  if (!a.limits) return null;
  if (!limiters.has(a.id)) limiters.set(a.id, rateLimiter(a.limits));
  return limiters.get(a.id);
};

/** Best effort: a failure to log a run must never break the ingestion itself. */
export async function recordRun(db, run) {
  try {
    const { error } = await db.from('ingest_runs').insert(run);
    if (error) console.error('[sync] could not record run', error.message);
  } catch (e) { console.error('[sync] could not record run', e?.message); }
}

/**
 * @returns {{ status: string, provider: string|null, events: any[], rejected: number, inconsistent?: boolean, error?: string }}
 */
export async function syncSchedule(db, { sport, day, env, trigger = 'cron', fetchImpl = fetch, store = null, now = () => Date.now() }) {
  const cfg = SPORTS_CONFIG[sport];
  const started = new Date(now()).toISOString();
  const attempts = [];
  for (const id of cfg.providers.schedule) {
    const a = ADAPTERS[id];
    const ready = readiness(a, env, sport);
    if (!a?.schedule || ready.state === 'awaiting_credentials' || ready.state === 'fixture') { attempts.push({ id, skipped: ready.state }); continue; }
    try {
      const raw = await a.schedule(day, { env, fetchImpl, limiter: limiterFor(a), log: () => {} });
      const { valid, rejected, inconsistent } = partition(raw);
      const events = dedupe(valid);
      // A mostly-broken response is treated as a provider failure, not as data.
      if (inconsistent) { attempts.push({ id, error: 'inconsistent_response', rejected: rejected.length }); continue; }
      const status = rejected.length ? 'partial' : 'ok';
      if (store) await store.put(`sched:${sport}:${day}`, { fetchedAt: new Date(now()).toISOString(), provider: id, events }).catch(() => {});
      await recordRun(db, { sport, kind: 'schedule', provider: id, trigger, status, started_at: started, records_in: raw.length, records_valid: events.length,
        records_rejected: rejected.length, data_as_of: day, details: { attempts, rejectedIssues: rejected.slice(0, 5).map(r => r.issues) } });
      return { status, provider: id, events, rejected: rejected.length };
    } catch (e) { attempts.push({ id, error: e?.code || 'error' }); }
  }
  const failed = attempts.some(x => x.error);
  await recordRun(db, { sport, kind: 'schedule', provider: attempts.find(x => x.error)?.id || cfg.providers.schedule[0] || 'none', trigger,
    status: failed ? 'failed' : 'skipped', started_at: started, error_code: failed ? String(attempts.find(x => x.error).error).slice(0, 80) : 'no_configured_provider', details: { attempts } });
  return { status: failed ? 'failed' : 'skipped', provider: null, events: [], rejected: 0, error: failed ? 'all_providers_failed' : 'no_configured_provider', attempts };
}
