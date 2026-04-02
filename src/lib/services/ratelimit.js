import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

let redis;
let limiters = {};

function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

const PLAN_LIMITS = {
  free:  { predictions: { requests: 5,   window: '1 d' }, api: { requests: 30,   window: '1 h' } },
  pro:   { predictions: { requests: 50,  window: '1 d' }, api: { requests: 200,  window: '1 h' } },
  elite: { predictions: { requests: 500, window: '1 d' }, api: { requests: 1000, window: '1 h' } },
};

function getLimiter(plan, type) {
  const key = `${plan}:${type}`;
  if (!limiters[key]) {
    const config = PLAN_LIMITS[plan]?.[type] ?? PLAN_LIMITS.free[type];
    limiters[key] = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true,
      prefix: `niosports:${key}`,
    });
  }
  return limiters[key];
}

export async function checkRateLimit(userId, plan = 'free', type = 'predictions') {
  try {
    const limiter = getLimiter(plan, type);
    const result = await limiter.limit(userId);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.error('[RateLimit] Upstash error, failing open:', err.message);
    return { success: true, limit: 999, remaining: 999, reset: 0 };
  }
}

export { PLAN_LIMITS };