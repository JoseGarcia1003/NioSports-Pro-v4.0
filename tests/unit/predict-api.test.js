vi.mock('$lib/server/identity.js', () => ({ requireIdentity: vi.fn(async () => ({ uid: 'verified-user' })) }));
vi.mock('$lib/server/entitlements.js', () => ({ getEntitlements: vi.fn(async () => ({ plan: 'free' })) }));
vi.mock('$lib/services/ratelimit.js', () => ({ checkRateLimit: vi.fn(async () => ({ success: true, limit: 5, remaining: 4, reset: 0 })) }));
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the engine before importing
vi.mock('$lib/engine/predictor.js', () => ({
  predict: vi.fn(() => ({
    projection: 225.5,
    baseProjection: 224.0,
    line: 220,
    edge: 5.5,
    period: 'FULL',
    direction: 'OVER',
    probability: 0.62,
    probabilityPercent: 62,
    confidence: 'MEDIUM',
    ev: 3.2,
    evPercent: 3.2,
    isValueBet: true,
    totalAdjustment: 1.5,
    topFactors: [],
    factorsDisplay: '',
    modelVersion: '2.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
  })),
}));

vi.mock('$lib/engine/constants.js', () => ({
  MODEL_VERSION: { version: '2.0.0', lastUpdated: '2026-01-01' },
}));

describe('Predict API', () => {
  it('rejects missing period statistics before invoking the model', async () => {
    const { POST } = await import('../../src/routes/api/predict/+server.js');
    const { predict } = await import('$lib/engine/predictor.js');
    predict.mockClear();
    const response = await POST({request:new Request('http://localhost/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({homeTeam:{name:'Lakers',stats:{}},awayTeam:{name:'Celtics',stats:{}},line:220})})});
    expect(response.status).toBe(400);
    expect((await response.json()).status).toBe('abstained');
    expect(predict).not.toHaveBeenCalled();
  });
  it('does not trust claimed elite plan or another user ID', async () => {
    const { POST } = await import('../../src/routes/api/predict/+server.js');
    const { checkRateLimit } = await import('$lib/services/ratelimit.js');
    checkRateLimit.mockClear();
    const response = await POST({request:new Request('http://localhost/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({homeTeam:{name:'Lakers',stats:{fullHome:115}},awayTeam:{name:'Celtics',stats:{fullAway:112}},line:220,userId:'victim',plan:'elite',source:'totales'})})});
    expect(response.status).toBe(200);
    expect(checkRateLimit).toHaveBeenCalledWith('verified-user','free','predictions');
  });
  it('should require homeTeam and awayTeam', async () => {
    const { POST } = await import('../../src/routes/api/predict/+server.js');

    const request = new Request('http://localhost/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST({ request });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return prediction for valid input', async () => {
    const { POST } = await import('../../src/routes/api/predict/+server.js');

    const request = new Request('http://localhost/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeTeam: { name: 'Lakers', stats: { fullHome: 115 } },
        awayTeam: { name: 'Celtics', stats: { fullAway: 112 } },
        line: 220,
        period: 'FULL',
      }),
    });

    const response = await POST({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.projection).toBeDefined();
    expect(data.direction).toBeDefined();
    expect(data.confidence).toBeDefined();
  });
});
