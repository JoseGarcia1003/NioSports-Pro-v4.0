// On-demand run of the daily pipeline, for the owner only (OWNER_USER_IDS).
// A database lock stops overlapping runs and repeated clicks.
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { isOwner } from '$lib/server/telemetry.js';
import { runDaily } from '$lib/server/daily.js';

export const config = { maxDuration: 60 };
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST({ request }) {
  const identity = await requireIdentity(request);
  if (!isOwner(identity.uid, env.OWNER_USER_IDS)) error(403, 'Forbidden');
  const db = adminDatabase();
  const { data: locked, error: lockError } = await db.rpc('try_provider_lock', { p_key: 'ops:sync', p_seconds: 90 });
  if (lockError) return json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  if (!locked) return json({ error: 'already_running' }, { status: 409, headers: NO_STORE });
  return json(await runDaily(db, env, { trigger: 'manual' }), { headers: NO_STORE });
}
