import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { isOwner } from '$lib/server/telemetry.js';

// System health for the owner only (OWNER_USER_IDS): data freshness, odds cache,
// signals, real-user Web Vitals (p75, 7 days) and recent errors.
export async function GET({ request }) {
  const identity = await requireIdentity(request);
  if (!isOwner(identity.uid, env.OWNER_USER_IDS)) error(403, 'Forbidden');
  const { data, error: failure } = await adminDatabase().rpc('ops_health');
  if (failure) return json({ error: 'unavailable' }, { status: 503 });
  return json({ ...data, checkedAt: new Date().toISOString() });
}
