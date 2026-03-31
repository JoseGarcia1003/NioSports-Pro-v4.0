// src/routes/api/cron/fetch-odds/+server.js
// Fetches NBA totals odds from The Odds API and stores snapshots in Supabase.
// Cron: runs 3x daily (17:00, 20:00, 23:00 UTC) or on-demand.

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

const ODDS_API_KEY = env.ODDS_API_KEY || '';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4/sports/basketball_nba/odds';

function getSupabase() {
  return createClient(env.VITE_SUPABASE_URL || '', env.SUPABASE_SERVICE_ROLE_KEY || '');
}

function determineSnapshotType() {
  const hour = new Date().getUTCHours();
  // Before 17:00 UTC = opening, 17:00-22:00 = current, after 22:00 = closing
  if (hour < 17) return 'opening';
  if (hour >= 22) return 'closing';
  return 'current';
}

export async function GET({ request }) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET || '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ODDS_API_KEY) {
    return json({
      status: 'skipped',
      message: 'ODDS_API_KEY not configured. Add it to enable CLV tracking.',
    });
  }

  const supabase = getSupabase();
  const snapshotType = determineSnapshotType();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch NBA totals odds
    const url = new URL(ODDS_API_BASE);
    url.searchParams.set('apiKey', ODDS_API_KEY);
    url.searchParams.set('regions', 'us');
    url.searchParams.set('markets', 'totals');
    url.searchParams.set('oddsFormat', 'american');

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      console.error('[fetch-odds] API error:', res.status, errText);
      return json({ error: 'Odds API error', status: res.status }, { status: 500 });
    }

    const games = await res.json();
    const remaining = res.headers.get('x-requests-remaining');
    console.log(`[fetch-odds] Got ${games.length} games. API requests remaining: ${remaining}`);

    let savedCount = 0;

    for (const game of games) {
      // Find the game in our database by team names and date
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      const gameDate = game.commence_time?.split('T')[0] || today;

      // Look up game_id in Supabase
      const { data: dbGame } = await supabase
        .from('games')
        .select('id')
        .eq('date', gameDate)
        .limit(1)
        .maybeSingle();

      // Extract best totals line (use first bookmaker with totals)
      let totalLine = null;
      let overOdds = null;
      let underOdds = null;
      let bookmaker = null;

      for (const bk of game.bookmakers || []) {
        const totalsMarket = bk.markets?.find(m => m.key === 'totals');
        if (totalsMarket && totalsMarket.outcomes?.length >= 2) {
          const over = totalsMarket.outcomes.find(o => o.name === 'Over');
          const under = totalsMarket.outcomes.find(o => o.name === 'Under');
          if (over && under) {
            totalLine = over.point;
            overOdds = over.price;
            underOdds = under.price;
            bookmaker = bk.key;
            // Prefer Pinnacle if available
            if (bk.key === 'pinnacle') break;
          }
        }
      }

      if (!totalLine) continue;

      // Save odds snapshot
      const snapshot = {
        game_id: dbGame?.id || null,
        external_game_id: game.id,
        home_team: homeTeam,
        away_team: awayTeam,
        game_date: gameDate,
        bookmaker: bookmaker,
        period: 'FULL',
        total_line: totalLine,
        over_odds: overOdds,
        under_odds: underOdds,
        snapshot_type: snapshotType,
        captured_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('odds_snapshots')
        .insert(snapshot);

      if (error) {
        console.warn(`[fetch-odds] Insert error for ${homeTeam} vs ${awayTeam}:`, error.message);
      } else {
        savedCount++;
      }
    }

    return json({
      status: 'ok',
      snapshot_type: snapshotType,
      games_found: games.length,
      snapshots_saved: savedCount,
      api_requests_remaining: remaining,
    });

  } catch (err) {
    console.error('[fetch-odds] Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}