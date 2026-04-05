 // src/routes/api/email/results/+server.js
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { sendResultsEmail } from '$lib/services/email.js';

function getSupabase() {
  return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST({ request }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Get picks resolved today (from yesterday's games)
    const { data: resolvedPicks } = await supabase
      .from('picks')
      .select('*')
      .gte('resolved_at', yesterday + 'T00:00:00Z')
      .order('resolved_at', { ascending: false });

    if (!resolvedPicks || resolvedPicks.length === 0) {
      return json({ message: 'No resolved picks, no emails sent', sent: 0 });
    }

    // Calculate aggregate results
    const wins = resolvedPicks.filter(p => p.status === 'win' || p.result === 'win').length;
    const losses = resolvedPicks.filter(p => p.status === 'loss' || p.result === 'loss').length;
    const pushes = resolvedPicks.filter(p => p.status === 'push' || p.result === 'push').length;
    const profit = resolvedPicks.reduce((acc, p) => {
      const r = p.status || p.result;
      if (r === 'win') return acc + 0.909;
      if (r === 'loss') return acc - 1;
      return acc;
    }, 0).toFixed(2);

    const resultsData = { wins, losses, pushes, profit, picks: resolvedPicks };

    // Get Pro and Elite users
    const { data: users } = await supabase
      .from('user_profiles')
      .select('user_id, email, display_name, plan, subscription_status')
      .in('plan', ['pro', 'elite'])
      .eq('subscription_status', 'active');

    if (!users || users.length === 0) {
      return json({ message: 'No active subscribers', sent: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      if (!user.email) continue;
      try {
        await sendResultsEmail(user.email, user.display_name, resultsData);
        sent++;
        await new Promise(r => setTimeout(r, 200));
      } catch {
        failed++;
      }
    }

    console.log(`[Email/results] ${wins}W-${losses}L (${profit}u) — Sent: ${sent}, Failed: ${failed}`);
    return json({ sent, failed, wins, losses, profit });
  } catch (err) {
    console.error('[API/email/results] Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
}