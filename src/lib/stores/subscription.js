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
    const { data } = await supabase
      .from('user_profiles')
      .select('plan, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      subscription.set({
        plan: data.plan || 'free',
        status: data.subscription_status || 'none',
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        currentPeriodEnd: data.current_period_end,
      });
    }
  } catch (err) {
    console.error('[Subscription] Load error:', err);
  }
}