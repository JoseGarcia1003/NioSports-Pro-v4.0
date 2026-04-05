// src/routes/api/cron/verify-results/+server.js
// Verifies prediction results and calculates CLV for resolved picks.
// Cron: runs daily at 10:00 UTC (after all games from previous night finish).

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

const BDL_API_KEY = env.BALLDONTLIE_API_KEY || '';

function getSupabase() {
  return createClient(env.VITE_SUPABASE_URL || '', env.SUPABASE_SERVICE_ROLE_KEY || '');
}

export async function GET({ request }) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET || '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  try {
    // 1. Fetch final scores from BallDontLie
    let games = [];
    if (BDL_API_KEY) {
      const res = await fetch(
        `https://api.balldontlie.io/v1/games?dates[]=${dateStr}&per_page=15`,
        { headers: { Authorization: `Bearer ${BDL_API_KEY}` } }
      );

      if (res.ok) {
        const data = await res.json();
        games = (data.data || []).filter(g => g.status === 'Final');
        console.log(`[verify-results] ${games.length} final games for ${dateStr}`);
      }
    }

    let resolvedPicks = 0;
    let clvCalculated = 0;

    for (const game of games) {
      const actualTotal = game.home_team_score + game.visitor_team_score;

      // 2. Find pending picks for this game date
      const { data: picks } = await supabase
        .from('picks')
        .select('*')
        .eq('status', 'pending')
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);

      if (!picks || picks.length === 0) continue;

      for (const pick of picks) {
        // Match pick to game (by team names if available)
        const pickLine = pick.line || pick.bet_line || 0;
        const pickDirection = pick.direction || 'OVER';

        // Determine result
        let result;
        if (pickDirection === 'OVER') {
          result = actualTotal > pickLine ? 'win' : actualTotal < pickLine ? 'loss' : 'push';
        } else {
          result = actualTotal < pickLine ? 'win' : actualTotal > pickLine ? 'loss' : 'push';
        }

        // 3. Calculate CLV from odds_snapshots
        let clvPoints = null;
        let closingLine = null;

        // Get closing line for this game
        const { data: closingSnap } = await supabase
          .from('odds_snapshots')
          .select('total_line')
          .eq('game_date', dateStr)
          .eq('snapshot_type', 'closing')
          .eq('period', 'FULL')
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (closingSnap) {
          closingLine = closingSnap.total_line;

          // CLV = closing_line - bet_line (for OVER)
          // CLV = bet_line - closing_line (for UNDER)
          if (pickDirection === 'OVER') {
            clvPoints = closingLine - pickLine;
          } else {
            clvPoints = pickLine - closingLine;
          }
          clvCalculated++;
        }

        // 4. Update pick with result and CLV
        const updates = {
          status: result,
          result: result,
          actual_total: actualTotal,
          closing_line: closingLine,
          clv_points: clvPoints,
          resolved_at: new Date().toISOString(),
        };

        await supabase
          .from('picks')
          .update(updates)
          .eq('id', pick.id);

        resolvedPicks++;
      }
    }

    // 5. Also resolve predictions table
    for (const game of games) {
      const actualTotal = game.home_team_score + game.visitor_team_score;

      const { data: preds } = await supabase
        .from('predictions')
        .select('*')
        .eq('source', 'live')
        .is('result', null);

      if (!preds) continue;

      for (const pred of preds) {
        const predLine = pred.line || 0;
        const predDirection = pred.direction || 'OVER';

        let result;
        if (predDirection === 'OVER') {
          result = actualTotal > predLine ? 'win' : actualTotal < predLine ? 'loss' : 'push';
        } else {
          result = actualTotal < predLine ? 'win' : actualTotal > predLine ? 'loss' : 'push';
        }

        await supabase
          .from('predictions')
          .update({
            result,
            actual_total: actualTotal,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', pred.id);
      }
    }

// 6. Send results email to subscribers
    if (resolvedPicks > 0) {
      const origin = 'https://nio-sports-pro-v4-0.vercel.app';
      fetch(`${origin}/api/email/results`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cronSecret}`, 'Content-Type': 'application/json' },
      }).catch(err => console.warn('[verify-results] Email trigger failed:', err.message));
    }

    return json({
      status: 'ok',
      date: dateStr,
      games_found: games.length,
      picks_resolved: resolvedPicks,
      clv_calculated: clvCalculated,
    });

  } catch (err) {
    console.error('[verify-results] Error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}