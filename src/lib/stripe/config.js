// src/lib/stripe/config.js
// Configuración de planes y precios de NioSports Pro

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    predictions_per_day: 3,
    features: [
      '3 predicciones por día',
      'Track record público',
      'Resultados del día anterior',
    ],
    cta: 'Plan actual',
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    priceAnnual: 199,
    priceId_monthly: '', // Llenar con ID de Stripe Dashboard
    priceId_annual: '',  // Llenar con ID de Stripe Dashboard
    predictions_per_day: -1, // ilimitadas
    features: [
      'Predicciones ilimitadas',
      'Todos los períodos (Q1, HALF, FULL)',
      'Scores de confianza',
      'Dashboard de rendimiento',
      'Alertas por email',
      'Historial completo',
    ],
    cta: 'Comenzar Pro',
    popular: true,
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    price: 79.99,
    priceAnnual: 499,
    priceId_monthly: '', // Llenar con ID de Stripe Dashboard
    priceId_annual: '',  // Llenar con ID de Stripe Dashboard
    predictions_per_day: -1,
    features: [
      'Todo en Pro',
      'SHAP explanations por pick',
      'Acceso API',
      'Modelo en tiempo real',
      'Comunidad Discord privada',
      'Soporte prioritario',
    ],
    cta: 'Comenzar Elite',
    popular: false,
  },
};

export function canAccessFeature(userPlan, feature) {
  const hierarchy = { free: 0, pro: 1, elite: 2 };
  const required = { predictions_unlimited: 1, shap_details: 2, api_access: 2, discord: 2, email_alerts: 1 };
  return (hierarchy[userPlan] || 0) >= (required[feature] || 0);
}

export function getPredictionLimit(plan) {
  return PLANS[plan]?.predictions_per_day ?? 3;
}