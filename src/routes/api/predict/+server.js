import { buildMLInput } from '$lib/server/ml-input.js';
import { getEntitlements } from '$lib/server/entitlements.js';
// src/routes/api/predict/+server.js
// Motor predictivo server-side con Railway ML fallback a heurístico local.
// Rate limiting por plan via Upstash Redis.

import { json, isHttpError } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { predict } from '$lib/engine/predictor.js';
import { MODEL_VERSION } from '$lib/engine/constants.js';
import { env } from '$env/dynamic/private';
import { checkRateLimit } from '$lib/services/ratelimit.js';
import { predictionInputError } from '$lib/server/prediction-input.js';

const ML_API_URL = env.ML_API_URL || '';
const ML_API_KEY = env.ML_API_KEY || '';

// In-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(body) {
  return JSON.stringify({
    h: body.homeTeam?.name,
    a: body.awayTeam?.name,
    l: body.line,
    p: body.period,
  });
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  cache.set(key, { data, ts: Date.now() });
}

async function predictWithML(body) {
  if (!ML_API_URL) return null;

  try {
    const mlBody = buildMLInput(body);
    if (!mlBody) return null;




    const res = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ML_API_KEY,
      },
      body: JSON.stringify(mlBody),
      signal: AbortSignal.timeout(3000),
    });



    if (res.ok) {
      const data = await res.json();
      if (!data || !['projection','line','edge','probability','probability_pct','ev','ev_percent'].every(k => typeof data[k] === 'number' && Number.isFinite(data[k])) ||
          data.projection <= 0 || data.line !== body.line || data.probability < 0 || data.probability > 1 ||
          Math.abs(data.probability_pct - data.probability * 100) > 1 || !['OVER','UNDER'].includes(data.direction)) return null;
      return {
        projection: data.projection,
        line: data.line,
        edge: data.edge,
        period: body.period || 'FULL',
        direction: data.direction,
        probability: data.probability,
        probabilityPercent: data.probability_pct,
        confidence: data.confidence,
        ev: data.ev,
        evPercent: data.ev_percent,
        isValueBet: data.is_value_bet,
        totalAdjustment: 0,
        topFactors: [],
        factorsDisplay: '',
        modelVersion: data.model_version,
        generatedAt: new Date().toISOString(),
        source: 'ml-remote',
      };
    }
  } catch (err) {
    if (isHttpError(err)) throw err;
    console.warn('[API/predict] ML API unavailable, using fallback:', err.message);
  }

  return null;
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
  const identity = await requireIdentity(request);
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida.' }, { status: 400 }); }
    const inputError = predictionInputError(body);
    if (inputError) return json({ error: inputError, status: 'abstained' }, { status: 400 });
    const { homeTeam, awayTeam } = body;

    if (!homeTeam || !awayTeam) {
      return json({ error: 'homeTeam and awayTeam are required' }, { status: 400 });
    }

// ── Rate Limit ─────────────────────────────────────────────────────────
    const { plan: userPlan } = await getEntitlements(identity.uid);
    const rl = await checkRateLimit(identity.uid, userPlan, 'predictions');
    if (rl.unavailable) return json({ error: 'Quota service unavailable' }, { status: 503 });
    const cacheKey = JSON.stringify({ uid: identity.uid, model: MODEL_VERSION.version, input: body });
    if (!rl.success) {
      const resetMin = Math.ceil((rl.reset - Date.now()) / 60000);
      const planLabels = { free: 'Pro ($14.99/mes)', pro: 'Elite ($29.99/mes)', elite: null };
      const upgradeLabel = planLabels[userPlan];

      return json(
        {
          error: 'rate_limited',
          message: `Alcanzaste el límite de ${rl.limit} predicciones diarias del plan ${userPlan.toUpperCase()}. Se reinicia en ${resetMin} min.`,
          limit: rl.limit,
          remaining: 0,
          reset: rl.reset,
          upgrade: upgradeLabel ? { label: upgradeLabel, url: '/pricing' } : null,
        },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
        'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.reset),
            'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)),
          },
        }
      );
    }
    // ───────────────────────────────────────────────────────────────────────

    const cached = getCached(cacheKey);
    if (cached) return json({ ...cached, cached: true }, { headers: { 'Cache-Control': 'no-store' } });

    // Try ML API first
    let result = await predictWithML(body);

    // Fallback to local heuristic
    if (!result) {
      const prediction = predict({
        homeTeam,
        awayTeam,
        line: body.line || 0,
        period: body.period || 'FULL',
        gameInfo: body.gameInfo || {},
      });

      result = {
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
        source: 'heuristic-local',
      };
    }

    setCache(cacheKey, result);

    return json(result, {
      headers: {
        'Cache-Control': 'no-store',
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.reset),
      },
    });

  } catch (err) {
    if (isHttpError(err)) throw err;
    console.error('[API/predict] Error:', err.message);
    return json({ error: 'Prediction failed', details: err.message }, { status: 500 });
  }
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET() {
  const mlAvailable = !!ML_API_URL;
  let mlHealthy = false;

  if (mlAvailable) {
    try {
      const res = await fetch(`${ML_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
      mlHealthy = res.ok;
    } catch { /* ignore */ }
  }

  return json({
    status: 'ok',
    modelVersion: MODEL_VERSION.version,
    mlApi: { configured: mlAvailable, healthy: mlHealthy },
  });
}
