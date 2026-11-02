import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { getNbaTotals, getNbaPlayerPoints, supabaseStore } from '$lib/server/odds-cache.js';

// Sportsbook player-points lines for signed-in users, cached in Supabase.
export async function GET({ request }) {
  await requireIdentity(request);
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, reason: 'cache_unavailable', players: null }, { status: 503 });
  const store = supabaseStore(adminDatabase());
  const apiKey = env.ODDS_API_KEY || '';
  const totals = await getNbaTotals({ store, apiKey });
  if (!totals.ok) return json({ ok: false, reason: totals.reason, players: null }, { status: 503 });
  const result = await getNbaPlayerPoints({ store, apiKey, events: totals.events, quotaHint: totals.quotaRemaining });
  if (!result.ok) return json({ ...result, players: null }, { status: 503 });
  const { ok, cached, ...body } = result;
  return json(body);
}
