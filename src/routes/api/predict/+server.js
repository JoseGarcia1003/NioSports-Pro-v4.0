// src/routes/api/predict/+server.js
// ════════════════════════════════════════════════════════════════
// Motor predictivo ejecutando 100% server-side.
// El cliente NUNCA ve la lógica del engine.
// ════════════════════════════════════════════════════════════════

import { json } from '@sveltejs/kit';
import { predict } from '$lib/engine/predictor.js';
import { MODEL_VERSION } from '$lib/engine/constants.js';

const CRON_SECRET = import.meta.env.CRON_SECRET || process.env.CRON_SECRET || '';

// Simple in-memory cache (replaced by Redis in production)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(body) {
  return JSON.stringify(body);
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  // Limit cache size
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { homeTeam, awayTeam, line, period, gameInfo } = body;

    // Validate required fields
    if (!homeTeam || !awayTeam) {
      return json({ error: 'homeTeam and awayTeam are required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = getCacheKey({ homeTeam: homeTeam.name, awayTeam: awayTeam.name, line, period });
    const cached = getCached(cacheKey);
    if (cached) {
      return json({ ...cached, cached: true });
    }

    // Execute prediction server-side
    const prediction = predict({
      homeTeam,
      awayTeam,
      line: line || 0,
      period: period || 'FULL',
      gameInfo: gameInfo || {},
    });

    // Build response — expose results but NOT internal constants/weights
    const result = {
      projection: prediction.projection,
      baseProjection: prediction.baseProjection,
      line: prediction.line,
      edge: prediction.edge,
      period: prediction.period,
      direction: prediction.direction,
      probability: prediction.probability,
      probabilityPercent: prediction.probabilityPercent,
      confidence: prediction.confidence,
      ev: prediction.ev,
      evPercent: prediction.evPercent,
      isValueBet: prediction.isValueBet,
      totalAdjustment: prediction.totalAdjustment,
      topFactors: prediction.topFactors,
      factorsDisplay: prediction.factorsDisplay,
      modelVersion: prediction.modelVersion,
      generatedAt: prediction.generatedAt,
    };

    // Cache
    setCache(cacheKey, result);

    return json(result);
  } catch (err) {
    console.error('[API/predict] Error:', err.message);
    return json({ error: 'Prediction failed', details: err.message }, { status: 500 });
  }
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET() {
  return json({
    status: 'ok',
    modelVersion: MODEL_VERSION.version,
    lastUpdated: MODEL_VERSION.lastUpdated,
  });
}
