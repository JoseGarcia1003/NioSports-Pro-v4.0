import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { authorized, parseBatch } from '$lib/server/nba-ingest.js';
import { recordRun } from '$lib/server/sync.js';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST({ request }) {
  if (!authorized(request.headers.get('authorization'), env.INGEST_SECRET)) return json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, { status: 400, headers: NO_STORE }); }
  const parsed = parseBatch(body);
  if (parsed.error) return json(parsed, { status: 422, headers: NO_STORE });
  const started = new Date().toISOString();
  const db = adminDatabase();
  // Upsert on the natural key makes re-sending a batch idempotent (no duplicates).
  const { error } = await db.from('nba_player_games').upsert(parsed.rows.map(r => ({ ...r, ingested_at: new Date().toISOString() })), { onConflict: 'game_id,player_id' });
  const asOf = parsed.rows.reduce((m, r) => (r.game_date > m ? r.game_date : m), '') || null;
  await recordRun(db, { sport: 'nba', kind: 'boxscores', provider: 'nba-stats-ingest', trigger: 'push', status: error ? 'failed' : 'ok', started_at: started,
    records_in: parsed.rows.length, records_valid: error ? 0 : parsed.rows.length, data_as_of: asOf, error_code: error ? 'database' : null });
  if (error) return json({ error: 'database', detail: error.message }, { status: 500, headers: NO_STORE });
  return json({ ok: true, stored: parsed.rows.length }, { headers: NO_STORE });
}
