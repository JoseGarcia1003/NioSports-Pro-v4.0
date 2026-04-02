import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const supabase = createClient(
  env.VITE_SUPABASE_URL || '',
  env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data: picks, error } = await supabase
      .from('picks')
      .select(`id, created_at, direction, bet_line, confidence,
               status, clv_points, actual_total, home_team, away_team`)
      .in('status', ['won', 'lost', 'push'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const resolved = picks.filter(p => ['won', 'lost', 'push'].includes(p.status));
    const wins     = resolved.filter(p => p.status === 'won').length;
    const losses   = resolved.filter(p => p.status === 'lost').length;
    const pushes   = resolved.filter(p => p.status === 'push').length;
    const decididos = wins + losses;
    const winRate  = decididos > 0 ? (wins / decididos) * 100 : 0;
    const roi      = decididos > 0 ? ((wins * 0.909 - losses) / (wins + losses)) * 100 : 0;
    const clvVals  = resolved.filter(p => p.clv_points != null).map(p => p.clv_points);
    const clvAvg   = clvVals.length > 0 ? clvVals.reduce((a, b) => a + b, 0) / clvVals.length : 0;

    return json({
      picks,
      stats: { total: resolved.length, wins, losses, pushes, winRate, roi, clvAvg },
    });
  } catch (err) {
    console.error('[public/track-record]', err.message);
    return json({
      picks: [],
      stats: { total: 0, wins: 0, losses: 0, pushes: 0, winRate: 0, roi: 0, clvAvg: 0 },
    });
  }
}