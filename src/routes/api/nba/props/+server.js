import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { loadBoard } from '$lib/server/nba-props.js';

export async function GET({ url, request }) {
  await requireIdentity(request);
  try {
    const board = await loadBoard(adminDatabase(), env.BALLDONTLIE_API_KEY, url.searchParams.get('day') === '1' ? 1 : 0);
    return json({ ...board, sources: { schedule: 'balldontlie', stats: 'stats.nba.com' } });
  } catch (err) {
    return json({ error: err.message === 'stats_unavailable' ? 'stats_unavailable' : 'schedule_unavailable' }, { status: 503 });
  }
}
