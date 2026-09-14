// src/lib/config/plans.js
// Feature gating configuration for NioSports Pro

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      maxPicksPercent: 0,      // FREE receives exactly one available selection
      bankroll: true,
      fullStats: true,
      fullDashboard: true,
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
      maxPicksPercent: 1,      // Paid plans see all available selections
      bankroll: true,
      fullStats: true,
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
  const available = Number.isSafeInteger(totalAvailable) && totalAvailable > 0 ? totalAvailable : 0;
  return ['pro', 'elite'].includes(plan) ? available : Math.min(1, available);
}

// Check if a feature is available for a plan
export function hasFeature(plan, feature) {
  return PLANS[plan]?.features?.[feature] ?? false;
}