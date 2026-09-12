// Resolve only explicitly mapped NBA FULL totals. Quarter/half scores require another result contract.
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { settleNbaTotal } from '$lib/engine/settlement.js';

export async function GET({ request }) {
  if (!env.CRON_SECRET || request.headers.get('authorization') !== 'Bearer ' + env.CRON_SECRET) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.BALLDONTLIE_API_KEY) return json({ error: 'Results provider unavailable' }, { status: 503 });
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  const dateStr = date.toISOString().slice(0, 10);
  try {
    const response = await fetch('https://api.balldontlie.io/v1/games?dates[]=' + dateStr + '&per_page=100', {
      headers: { Authorization: env.BALLDONTLIE_API_KEY }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Results provider request failed');
    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw new Error('Invalid results payload');
    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    let resolvedPicks = 0;
    let resolvedPredictions = 0;
    for (const game of payload.data) {
      if (game.status !== 'Final' || !game.id) continue;
      const { data: mappedGames } = await supabase.from('games').select('id,external_id')
        .eq('external_id', String(game.id)).eq('date', dateStr).throwOnError();
      // Ambiguous mappings must never select the first game.
      if (mappedGames?.length !== 1) continue;
      const mapped = mappedGames[0];
      for (const table of ['picks', 'predictions']) {
        let query = supabase.from(table).select('*').eq('game_id', mapped.id).eq('period', 'FULL');
        query = table === 'picks' ? query.eq('status', 'pending') : query.eq('source', 'live').is('result', null);
        const { data: rows } = await query.throwOnError();
        for (const row of rows || []) {
          const settlement = settleNbaTotal(row, mapped, game);
          if (!settlement) continue;
          // CLV is unknown until a verified pre-event closing snapshot exists.
          const updates = table === 'picks' ? {
            status: settlement.outcome, actual_total: settlement.actualTotal,
            closing_line: null, clv: null, resolved_at: new Date().toISOString(),
          } : { result: settlement.outcome, actual_total: settlement.actualTotal };
          let write = supabase.from(table).update(updates).eq('id', row.id).eq('game_id', mapped.id);
          // Conditional update prevents duplicate resolution on retries/concurrent cron runs.
          write = table === 'picks' ? write.eq('status', 'pending') : write.is('result', null);
          const { data: changed } = await write.select('id').throwOnError();
          if (table === 'picks') resolvedPicks += changed?.length || 0;
          else resolvedPredictions += changed?.length || 0;
        }
      }
    }
    return json({ status: 'ok', date: dateStr, picks_resolved: resolvedPicks,
      predictions_resolved: resolvedPredictions, clv_calculated: 0 });
  } catch (error) {
    console.error('[verify-results]', error);
    return json({ error: 'Result verification failed' }, { status: 500 });
  }
}
