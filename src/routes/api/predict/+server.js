// src/routes/api/predict/+server.js
// Motor predictivo server-side con Railway ML fallback a heurístico local.
// Rate limiting por plan via Upstash Redis.

import { json } from '@sveltejs/kit';
import { predict } from '$lib/engine/predictor.js';
import { MODEL_VERSION } from '$lib/engine/constants.js';
import { env } from '$env/dynamic/private';
import { checkRateLimit } from '$lib/services/ratelimit.js';

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
    const homeStats = body.homeTeam?.stats || {};
    const awayStats = body.awayTeam?.stats || {};

    const mlBody = {
      home_team: {
        name: body.homeTeam?.name || '',
        total_l5: homeStats.fullHome || homeStats.full || 220,
        total_l10: homeStats.fullHome || homeStats.full || 220,
        total_l20: homeStats.fullHome || homeStats.full || 220,
        home_avg: homeStats.fullHome || homeStats.full || 220,
        away_avg: homeStats.fullAway || homeStats.full || 220,
        std: 10,
        rest_days: body.homeTeam?.restDays ?? 2,
        is_b2b: (body.homeTeam?.restDays ?? 2) === 0,
      },
      away_team: {
        name: body.awayTeam?.name || '',
        total_l5: awayStats.fullAway || awayStats.full || 220,
        total_l10: awayStats.fullAway || awayStats.full || 220,
        total_l20: awayStats.fullAway || awayStats.full || 220,
        home_avg: awayStats.fullHome || awayStats.full || 220,
        away_avg: awayStats.fullAway || awayStats.full || 220,
        std: 10,
        rest_days: body.awayTeam?.restDays ?? 2,
        is_b2b: (body.awayTeam?.restDays ?? 2) === 0,
      },
      line: body.line || 220,
      period: body.period || 'FULL',
      days_into_season: 150,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ML_API_KEY,
      },
      body: JSON.stringify(mlBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
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
        source: data.source,
      };
    }
  } catch (err) {
    console.warn('[API/predict] ML API unavailable, using fallback:', err.message);
  }

  return null;
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { homeTeam, awayTeam } = body;

    if (!homeTeam || !awayTeam) {
      return json({ error: 'homeTeam and awayTeam are required' }, { status: 400 });
    }

// ── Rate Limit ─────────────────────────────────────────────────────────
    const userId = body.userId || 'anonymous';
    const userPlan = body.plan || 'free';
    const source = body.source || 'unknown';

    // Owner bypass — skip rate limiting entirely
    const OWNER_IDS = (env.OWNER_USER_IDS || '').split(',').filter(Boolean);
    const isOwner = OWNER_IDS.includes(userId);

    // Totales calculator doesn't consume picks quota
    const isTotales = source === 'totales';

    // Si está cacheado, no consume cuota
    const cacheKey = getCacheKey(body);
    const cached = getCached(cacheKey);
    if (cached) {
      return json({ ...cached, cached: true }, {
        headers: {
          'X-RateLimit-Source': 'cache',
        },
      });
    }

    // Owner and totales skip rate limiting
    let rl = { success: true, limit: 999, remaining: 999, reset: 0 };
    if (!isOwner) {
      rl = await checkRateLimit(userId, userPlan, isTotales ? 'api' : 'predictions');
    }

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
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.reset),
            'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)),
          },
        }
      );
    }
    // ───────────────────────────────────────────────────────────────────────

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
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.reset),
      },
    });

  } catch (err) {
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