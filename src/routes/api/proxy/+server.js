import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const BDL_BASE = 'https://api.balldontlie.io/v1';
const API_KEY  = env.BALLDONTLIE_API_KEY || '';

const ALLOWED_PATHS = ['/games', '/players', '/teams', '/stats', '/season_averages', '/box_scores'];

export async function GET({ url }) {
  const path = url.searchParams.get('path') || url.searchParams.get('endpoint') || '/games';
  const params = url.searchParams.get('params') || '';

  if (!ALLOWED_PATHS.some(p => path.startsWith(p))) {
    return json({ error: 'Path not allowed' }, { status: 403 });
  }

  if (!API_KEY) {
    return json(getMockData(path), { headers: { 'X-Data-Source': 'mock' } });
  }

  try {
    const targetUrl = `${BDL_BASE}${path}${params ? '?' + params : ''}`;
    const res = await fetch(targetUrl, {
      headers: { 'Authorization': API_KEY, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return json(getMockData(path), { headers: { 'X-Data-Source': 'mock-fallback' } });
    }

    const data = await res.json();
    return json(data, {
      headers: { 'X-Data-Source': 'balldontlie', 'Cache-Control': 'public, max-age=300' }
    });
  } catch (err) {
    console.error('[proxy]', err.message);
    return json(getMockData(path), { headers: { 'X-Data-Source': 'mock-error-fallback' } });
  }
}

function getMockData(path) {
  if (path.startsWith('/games')) {
    return {
      data: [
        {
          id: 1001,
          date: new Date().toISOString().split('T')[0],
          home_team: { id: 1, name: 'Boston Celtics', abbreviation: 'BOS' },
          visitor_team: { id: 2, name: 'Golden State Warriors', abbreviation: 'GSW' },
          home_team_score: 0, visitor_team_score: 0, status: 'scheduled', period: 0,
        },
        {
          id: 1002,
          date: new Date().toISOString().split('T')[0],
          home_team: { id: 3, name: 'Los Angeles Lakers', abbreviation: 'LAL' },
          visitor_team: { id: 4, name: 'Denver Nuggets', abbreviation: 'DEN' },
          home_team_score: 0, visitor_team_score: 0, status: 'scheduled', period: 0,
        },
      ],
      meta: { total_pages: 1, current_page: 1, next_page: null, per_page: 25, total_count: 2 },
    };
  }
  return { data: [], meta: {} };
}