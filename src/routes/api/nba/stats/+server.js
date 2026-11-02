import { json } from '@sveltejs/kit';
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { allowedSeasons, loadSeason } from '$lib/server/nba-season.js';

// Season leaders (players and teams) and standings, from official box scores.
export async function GET({ url, request }) {
  await requireIdentity(request);
  const seasons = allowedSeasons();
  const season = url.searchParams.get('season') || seasons[0];
  if (!seasons.includes(season)) return json({ error: 'invalid season', seasons }, { status: 400 });
  try {
    return json({ ...(await loadSeason(adminDatabase(), season)), seasons });
  } catch {
    return json({ error: 'stats_unavailable' }, { status: 503 });
  }
}
