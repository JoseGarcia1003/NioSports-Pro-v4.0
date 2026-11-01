import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { authorized, parseBatch } from '$lib/server/nba-ingest.js';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST({ request }) {
  if (!authorized(request.headers.get('authorization'), env.INGEST_SECRET)) return json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, { status: 400, headers: NO_STORE }); }
  const parsed = parseBatch(body);
  if (parsed.error) return json(parsed, { status: 422, headers: NO_STORE });
  const { error } = await adminDatabase().from('nba_player_games').upsert(parsed.rows.map(r => ({ ...r, ingested_at: new Date().toISOString() })), { onConflict: 'game_id,player_id' });
  if (error) return json({ error: 'database', detail: error.message }, { status: 500, headers: NO_STORE });
  return json({ ok: true, stored: parsed.rows.length }, { headers: NO_STORE });
}
