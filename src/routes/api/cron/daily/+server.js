// Scheduled pipeline (Vercel cron, Bearer CRON_SECRET). See $lib/server/daily.js.
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { requireJobSecret } from '$lib/server/job-secret.js';
import { adminDatabase } from '$lib/server/entitlements.js';
import { runDaily } from '$lib/server/daily.js';

export const config = { maxDuration: 60 };

export async function GET({ request }) {
  requireJobSecret(request);
  return json(await runDaily(adminDatabase(), env, { trigger: 'cron' }), { headers: { 'Cache-Control': 'no-store' } });
}
