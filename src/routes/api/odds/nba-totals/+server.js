import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { Redis } from '@upstash/redis';
import { getNbaTotals } from '$lib/server/odds-cache.js';

let redis;
function getRedis() {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  redis ??= new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
  return redis;
}

export async function GET() {
  const result = await getNbaTotals({ redis: getRedis(), apiKey: env.ODDS_API_KEY || '' });
  if (!result.ok) return json({ ...result, events: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const { ok, cached, ...body } = result;
  return json(body, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
