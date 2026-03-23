import { describe, it, expect } from 'vitest';
import { PLANS, canAccessFeature, getPredictionLimit } from '$lib/stripe/config.js';

describe('Stripe config', () => {
  it('defines three plans', () => {
    expect(Object.keys(PLANS)).toHaveLength(3);
    expect(PLANS.free).toBeDefined();
    expect(PLANS.pro).toBeDefined();
    expect(PLANS.elite).toBeDefined();
  });

  it('free plan has correct limits', () => {
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.free.predictions_per_day).toBe(3);
  });

  it('pro plan has unlimited predictions', () => {
    expect(PLANS.pro.predictions_per_day).toBe(-1);
    expect(PLANS.pro.price).toBe(29.99);
  });

  it('elite plan has correct price', () => {
    expect(PLANS.elite.price).toBe(79.99);
    expect(PLANS.elite.priceAnnual).toBe(499);
  });
});

describe('canAccessFeature', () => {
  it('free cannot access premium features', () => {
    expect(canAccessFeature('free', 'predictions_unlimited')).toBe(false);
    expect(canAccessFeature('free', 'shap_details')).toBe(false);
    expect(canAccessFeature('free', 'api_access')).toBe(false);
  });

  it('pro can access pro features', () => {
    expect(canAccessFeature('pro', 'predictions_unlimited')).toBe(true);
    expect(canAccessFeature('pro', 'email_alerts')).toBe(true);
  });

  it('pro cannot access elite features', () => {
    expect(canAccessFeature('pro', 'shap_details')).toBe(false);
    expect(canAccessFeature('pro', 'api_access')).toBe(false);
  });

  it('elite can access everything', () => {
    expect(canAccessFeature('elite', 'predictions_unlimited')).toBe(true);
    expect(canAccessFeature('elite', 'shap_details')).toBe(true);
    expect(canAccessFeature('elite', 'api_access')).toBe(true);
    expect(canAccessFeature('elite', 'discord')).toBe(true);
  });
});

describe('getPredictionLimit', () => {
  it('returns 3 for free', () => {
    expect(getPredictionLimit('free')).toBe(3);
  });

  it('returns -1 (unlimited) for pro', () => {
    expect(getPredictionLimit('pro')).toBe(-1);
  });

  it('returns 3 for unknown plan', () => {
    expect(getPredictionLimit('unknown')).toBe(3);
  });
});