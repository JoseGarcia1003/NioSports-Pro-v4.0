import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase, getEntitlements } from '$lib/server/entitlements.js';
import { gateEdition, gatingEnabled } from '$lib/server/access.js';
import { requireIdentity } from '$lib/server/identity.js';
import { ensureEdition } from '$lib/server/signal-edition.js';
import { settledHistory } from '$lib/server/signal-results.js';

// Today's sealed edition (created by the scheduled job, or here as a fallback)
// with the settled history of previous editions.
export async function GET({ request }) {
  const { uid } = await requireIdentity(request);
  const db = adminDatabase();
  const { day, edition, reason } = await ensureEdition(db, env);
  const history = await settledHistory(db, day);
  const seal = edition ? await sealFor(db, day) : null;
  const enabled = gatingEnabled(env);
  const plan = enabled ? (await getEntitlements(uid)).plan : null;
  const gated = gateEdition(edition, { plan, enabled });
  return json({ day, edition: gated.edition, locked: gated.locked, reason, history, seal }, { headers: { 'Cache-Control': 'no-store' } });
}

async function sealFor(db, day) {
  const { data } = await db.from('prediction_seals').select('seq, hash, sealed_at, reveal_after').eq('edition_key', `nba:points:${day}`).maybeSingle();
  return data ? { seq: Number(data.seq), hash: data.hash, sealedAt: data.sealed_at, revealAfter: data.reveal_after } : null;
}
