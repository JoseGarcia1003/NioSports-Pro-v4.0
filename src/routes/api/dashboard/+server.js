import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { requireIdentity } from '$lib/server/identity.js';
import { adminDatabase } from '$lib/server/entitlements.js';
import { buildDashboard } from '$lib/server/dashboard.js';

// One request for the member dashboard; private to the verified identity.
export async function GET({ request }) {
  const { uid } = await requireIdentity(request);
  return json(await buildDashboard(adminDatabase(), uid, env), { headers: { 'Cache-Control': 'no-store' } });
}
