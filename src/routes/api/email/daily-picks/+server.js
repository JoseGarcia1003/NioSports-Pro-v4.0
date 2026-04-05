// src/routes/api/email/daily-picks/+server.js
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { sendDailyPicksEmail } from '$lib/services/email.js';

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
    const today = new Date().toISOString().slice(0, 10);

    // Get today's AI picks (model-generated, pending)
    const { data: picks } = await supabase
      .from('picks')
      .select('*')
      .eq('source', 'model')
      .gte('created_at', today + 'T00:00:00Z')
      .lte('created_at', today + 'T23:59:59Z')
      .order('ev', { ascending: false })
      .limit(10);

    if (!picks || picks.length === 0) {
      return json({ message: 'No picks today, no emails sent', sent: 0 });
    }

    // Get Pro and Elite users with emails
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
        await sendDailyPicksEmail(user.email, user.display_name, picks, today);
        sent++;
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch {
        failed++;
      }
    }

    console.log(`[Email/daily-picks] Sent: ${sent}, Failed: ${failed}`);
    return json({ sent, failed, totalPicks: picks.length });
  } catch (err) {
    console.error('[API/email/daily-picks] Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
}