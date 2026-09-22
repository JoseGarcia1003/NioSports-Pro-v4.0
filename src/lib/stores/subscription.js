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

let generation = 0;
export function resetSubscription() {
  generation++;
  subscription.set({ plan: 'free', status: 'none' });
}
// Load server-verified entitlements; discard responses from older sessions.
export async function loadSubscription() {
  const current = ++generation;
  subscription.set({ plan: 'free', status: 'loading' });
  try {
    const { authenticatedFetch } = await import('$lib/services/authenticated-fetch.js');
    const response = await authenticatedFetch('/api/account');
    if (!response.ok) throw new Error('Subscription unavailable');
    const result = await response.json();
    if (current === generation) subscription.set(result);
  } catch {
    if (current === generation) subscription.set({ plan: 'free', status: 'unavailable' });
  }
}
