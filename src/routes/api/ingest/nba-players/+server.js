import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { authorized, parsePlayers } from '$lib/server/nba-ingest.js';

const NO_STORE = { 'Cache-Control': 'no-store' };

// Official positions sent by the owner's script (same secret as box scores).
export async function POST({ request }) {
  if (!authorized(request.headers.get('authorization'), env.INGEST_SECRET)) return json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, { status: 400, headers: NO_STORE }); }
  const parsed = parsePlayers(body);
  if (parsed.error) return json(parsed, { status: 422, headers: NO_STORE });
  const now = new Date().toISOString();
  const { error } = await adminDatabase().from('nba_players').upsert(parsed.rows.map(r => ({ ...r, updated_at: now })), { onConflict: 'player_id' });
  if (error) return json({ error: 'database' }, { status: 500, headers: NO_STORE });
  return json({ ok: true, stored: parsed.rows.length }, { headers: NO_STORE });
}
