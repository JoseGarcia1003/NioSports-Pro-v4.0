import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const BDL_BASE = 'https://api.balldontlie.io/v1';
const ALLOWED_PATHS = ['/games', '/players', '/teams', '/stats', '/season_averages', '/box_scores'];

// Never answer with sample games: when the provider is unavailable the client
// receives an explicit error and shows the absence instead of invented matches.
function unavailable(status, reason, upstreamStatus) {
  const headers = { 'X-Data-Source': 'unavailable', 'Cache-Control': 'no-store' };
  if (upstreamStatus) headers['X-Upstream-Status'] = String(upstreamStatus);
  return json({ error: 'NBA data source unavailable', reason, data: null }, { status, headers });
}

export async function GET({ url }) {
  const path = url.searchParams.get('path') || url.searchParams.get('endpoint') || '/games';
  const params = url.searchParams.get('params') || '';

  if (!ALLOWED_PATHS.some(p => path.startsWith(p))) {
    return json({ error: 'Path not allowed' }, { status: 403 });
  }

  const apiKey = env.BALLDONTLIE_API_KEY || '';
  if (!apiKey) return unavailable(503, 'not_configured');

  try {
    const res = await fetch(`${BDL_BASE}${path}${params ? '?' + params : ''}`, {
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const reason = res.status === 401 ? 'unauthorized' : res.status === 429 ? 'rate_limited' : 'upstream_error';
      console.error('[proxy] balldontlie responded', res.status, path);
      return unavailable(502, reason, res.status);
    }

    const data = await res.json();
    return json(data, {
      headers: { 'X-Data-Source': 'balldontlie', 'Cache-Control': 'public, max-age=300' }
    });
  } catch (err) {
    console.error('[proxy]', err.message);
    return unavailable(504, 'network_error');
  }
}
