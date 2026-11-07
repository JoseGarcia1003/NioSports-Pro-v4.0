import { json } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { adminDatabase } from '$lib/server/entitlements.js';
import { limitsView, updateLimits } from '$lib/server/bankroll-limits.js';

const NO_STORE = { 'Cache-Control': 'no-store' };
export async function GET({ request }) {
  const { uid } = await requireIdentity(request);
  try { return json(await limitsView(adminDatabase(), uid), { headers: NO_STORE }); }
  catch { return json({ error: 'unavailable' }, { status: 503, headers: NO_STORE }); }
}
export async function PUT({ request }) {
  const { uid } = await requireIdentity(request);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, { status: 400, headers: NO_STORE }); }
  const allowed = ['maxStakeMinor', 'dailyStakeMinor', 'weeklyLossMinor', 'pauseDays'];
  if (!body || typeof body !== 'object' || Object.keys(body).some(k => !allowed.includes(k))) return json({ error: 'invalid_fields' }, { status: 400, headers: NO_STORE });
  try {
    const db = adminDatabase();
    const r = await updateLimits(db, uid, body);
    return json({ applied: r.applied, deferred: r.deferred, ...(await limitsView(db, uid)) }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof RangeError) return json({ error: e.message }, { status: 400, headers: NO_STORE });
    return json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
