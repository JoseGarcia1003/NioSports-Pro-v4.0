// src/routes/api/cron/fetch-odds/+server.js
// ════════════════════════════════════════════════════════════════
// Cron: obtiene líneas de totales NBA desde The Odds API.
// Schedule: 0 17,20,23 * * * (cada 3h durante horario de partidos)
// ════════════════════════════════════════════════════════════════

import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const ODDS_API_KEY = env.ODDS_API_KEY || '';
const CRON_SECRET = env.CRON_SECRET || '';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ request }) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ODDS_API_KEY) {
    return json({
      success: false,
      message: 'ODDS_API_KEY not configured. Skipping odds fetch.',
      note: 'Configure ODDS_API_KEY in Vercel env vars to enable real odds.'
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch NBA totals odds
    const url = new URL(`${ODDS_API_BASE}/sports/basketball_nba/odds`);
    url.searchParams.set('apiKey', ODDS_API_KEY);
    url.searchParams.set('regions', 'us');
    url.searchParams.set('markets', 'totals');
    url.searchParams.set('oddsFormat', 'american');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      const remaining = res.headers.get('x-requests-remaining');
      return json({
        error: `Odds API error: ${res.status}`,
        requestsRemaining: remaining
      }, { status: 502 });
    }

    const games = await res.json();
    const requestsRemaining = res.headers.get('x-requests-remaining');
    const requestsUsed = res.headers.get('x-requests-used');

    let oddsStored = 0;

    for (const game of games) {
      const gameDate = game.commence_time?.split('T')[0];
      if (!gameDate) continue;

      // Extract totals from bookmakers (prefer Pinnacle, FanDuel, DraftKings)
      const preferredBooks = ['pinnacle', 'fanduel', 'draftkings', 'betmgm'];
      let bestLine = null;
      let bestBookmaker = null;
      let overOdds = null;
      let underOdds = null;

      for (const bookmaker of (game.bookmakers || [])) {
        const totalsMarket = bookmaker.markets?.find(m => m.key === 'totals');
        if (!totalsMarket) continue;

        const overOutcome = totalsMarket.outcomes?.find(o => o.name === 'Over');
        const underOutcome = totalsMarket.outcomes?.find(o => o.name === 'Under');

        if (overOutcome?.point) {
          const priority = preferredBooks.indexOf(bookmaker.key);
          if (!bestLine || (priority >= 0 && priority < preferredBooks.indexOf(bestBookmaker))) {
            bestLine = overOutcome.point;
            bestBookmaker = bookmaker.key;
            overOdds = overOutcome.price;
            underOdds = underOutcome?.price;
          } else if (!bestBookmaker || !preferredBooks.includes(bestBookmaker)) {
            bestLine = overOutcome.point;
            bestBookmaker = bookmaker.key;
            overOdds = overOutcome.price;
            underOdds = underOutcome?.price;
          }
        }
      }

      if (!bestLine) continue;

      // Find matching game in Supabase
      const { data: dbGames } = await supabase
        .from('games')
        .select('id')
        .eq('date', gameDate)
        .limit(20);

      if (!dbGames || dbGames.length === 0) continue;

      const homeNorm = game.home_team?.toLowerCase().replace(/[^a-z]/g, '') || '';
      const matchedGame = dbGames.find(g => {
        const gidLower = g.id.toLowerCase().replace(/[^a-z]/g, '');
        return gidLower.includes(homeNorm.slice(-8));
      });

      const gameId = matchedGame?.id || dbGames[0]?.id;
      if (!gameId) continue;

      const { data: existingOdds } = await supabase
        .from('odds_snapshots')
        .select('id')
        .eq('game_id', gameId)
        .eq('period', 'FULL')
        .limit(1);

      const snapshotType = (!existingOdds || existingOdds.length === 0) ? 'opening' : 'current';

      const { error } = await supabase
        .from('odds_snapshots')
        .insert({
          game_id: gameId,
          period: 'FULL',
          line: bestLine,
          bookmaker: bestBookmaker,
          over_odds: overOdds,
          under_odds: underOdds,
          snapshot_type: snapshotType,
        });

      if (!error) oddsStored++;
    }

    return json({
      success: true,
      gamesFromAPI: games.length,
      oddsStored,
      requestsRemaining,
      requestsUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron/fetch-odds] Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
}
