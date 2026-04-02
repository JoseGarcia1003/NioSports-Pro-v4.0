// src/lib/config/plans.js
// Feature gating configuration for NioSports Pro

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      maxPicksPercent: 0.1,    // 1 pick = ~10% of daily picks (minimum 1)
      bankroll: false,
      fullStats: false,
      fullDashboard: false,
      clvTracking: false,
      csvExport: false,
      totalesCalculator: true,
    },
    badge: 'Gratis',
    color: '#94A3B8',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 14.99,
    priceId: 'price_1THmDIRpBJAbdxQYuJBENDs5',
    features: {
      maxPicksPercent: 0.7,    // 70% of daily picks
      bankroll: true,
      fullStats: false,
      fullDashboard: true,
      clvTracking: false,
      csvExport: true,
      totalesCalculator: true,
    },
    badge: 'Popular',
    color: '#6366F1',
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 29.99,
    priceId: 'price_1THmDrRpBJAbdxQYqISzO55F',
    features: {
      maxPicksPercent: 1.0,    // 100% of daily picks
      bankroll: true,
      fullStats: true,
      fullDashboard: true,
      clvTracking: true,
      csvExport: true,
      totalesCalculator: true,
    },
    badge: 'Completo',
    color: '#10B981',
  },
};

// Map Stripe Price ID → plan
export function getPlanByPriceId(priceId) {
  return Object.values(PLANS).find(p => p.priceId === priceId) || PLANS.free;
}

// Calculate max picks for a plan given total available today
export function getMaxPicks(plan, totalAvailable) {
  const pct = PLANS[plan]?.features?.maxPicksPercent ?? 0.1;
  return Math.max(1, Math.round(totalAvailable * pct));
}

// Check if a feature is available for a plan
export function hasFeature(plan, feature) {
  return PLANS[plan]?.features?.[feature] ?? false;
}