// src/lib/stores/subscription.js
import { writable, derived } from 'svelte/store';
import { PLANS } from '$lib/config/plans.js';

// Current user subscription state
export const subscription = writable({
  plan: 'free',
  status: 'none',        // 'none', 'active', 'canceled', 'past_due'
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodEnd: null,
});

// Derived: current plan config
export const currentPlan = derived(subscription, ($sub) => {
  return PLANS[$sub.plan] || PLANS.free;
});

// Derived: is premium (pro or elite)
export const isPremium = derived(subscription, ($sub) => {
  return $sub.plan !== 'free' && $sub.status === 'active';
});

// Derived: feature checker
export const features = derived(subscription, ($sub) => {
  const plan = PLANS[$sub.plan] || PLANS.free;
  return plan.features;
});

// Load subscription from Supabase user_profiles
export async function loadSubscription(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Subscription] Load error:', error.message);
      return;
    }

    if (data) {
      subscription.set({
        plan: data.plan || 'free',
        status: data.subscription_status || data.plan_status || (data.plan && data.plan !== 'free' ? 'active' : 'none'),
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        currentPeriodEnd: data.current_period_end || data.plan_expires_at,
      });
    }
  } catch (err) {
    console.error('[Subscription] Load error:', err);
  }
}