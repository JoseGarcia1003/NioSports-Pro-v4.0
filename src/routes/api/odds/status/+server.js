import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Health check for The Odds API. The /v4/sports listing does not consume
// credits, so it verifies the key and reports the monthly quota safely.
const BASE = 'https://api.the-odds-api.com/v4';
const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  const key = env.ODDS_API_KEY || '';
  if (!key) return json({ configured: false, ok: false }, { status: 503, headers: NO_STORE });
  try {
    const res = await fetch(`${BASE}/sports?apiKey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(5000) });
    const quota = {
      remaining: numberOrNull(res.headers.get('x-requests-remaining')),
      used: numberOrNull(res.headers.get('x-requests-used')),
    };
    if (!res.ok) return json({ configured: true, ok: false, upstreamStatus: res.status, quota }, { status: 502, headers: NO_STORE });
    const sports = await res.json();
    const nba = Array.isArray(sports) && sports.some(s => s.key === 'basketball_nba' && s.active);
    return json({ configured: true, ok: true, nbaActive: nba, quota }, { headers: NO_STORE });
  } catch {
    return json({ configured: true, ok: false, reason: 'network_error' }, { status: 504, headers: NO_STORE });
  }
}

function numberOrNull(value) {
  const n = Number(value);
  return value != null && Number.isFinite(n) ? n : null;
}
