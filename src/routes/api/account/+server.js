import { json } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { getEntitlements } from '$lib/server/entitlements.js';
export async function GET({ request }) {
  const identity = await requireIdentity(request);
  return json(await getEntitlements(identity.uid), { headers: { 'Cache-Control': 'no-store' } });
}
