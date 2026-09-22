import { createClient } from '@supabase/supabase-js';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function adminDatabase() {
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) error(503, 'Database unavailable');
  return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export function effectivePlan(account, now = Date.now()) {
  if (!account || !['active', 'trialing'].includes(account.subscription_status) ||
      !['pro', 'elite'].includes(account.plan) ||
      !(Date.parse(account.current_period_end) > now)) return 'free';
  return account.plan;
}

export async function getEntitlements(uid) {
  const { data, error: failure } = await adminDatabase().from('billing_accounts')
    .select('plan,subscription_status,current_period_end').eq('user_id', uid).maybeSingle();
  if (failure) error(503, 'Subscription verification unavailable');
  return { plan: effectivePlan(data), status: data?.subscription_status || 'none',
    currentPeriodEnd: data?.current_period_end || null };
}
