import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { getNbaTotals, supabaseStore } from '$lib/server/odds-cache.js';

function store() {
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return supabaseStore(adminDatabase());
}

export async function GET() {
  const result = await getNbaTotals({ store: store(), apiKey: env.ODDS_API_KEY || '' });
  if (!result.ok) return json({ ...result, events: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const { ok, cached, ...body } = result;
  return json(body, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
