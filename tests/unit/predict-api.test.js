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