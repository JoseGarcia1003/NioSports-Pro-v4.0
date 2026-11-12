import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase, getEntitlements } from '$lib/server/entitlements.js';
import { gateEdition, gatingEnabled } from '$lib/server/access.js';
import { requireIdentity } from '$lib/server/identity.js';
import { ensureEdition } from '$lib/server/signal-edition.js';
import { loadBoxScores } from '$lib/server/signal-results.js';
import { settle, summarize } from '$lib/nba/signals.js';

const HISTORY_DAYS = 30;

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

async function settledHistory(db, today) {
  const since = new Date(Date.parse(`${today}T12:00:00Z`) - HISTORY_DAYS * 86400000).toISOString().slice(0, 10);
  const { data: editions } = await db.from('nba_signal_editions').select('day, sealed_at, entries').lt('day', today).gte('day', since).order('day', { ascending: false });
  const list = editions || [];
  let boxFor = () => null;
  try { boxFor = await loadBoxScores(db, list.map(e => [e.day, e.entries])); } catch { /* results unavailable: entries stay pending */ }
  const days = list.map(e => ({ day: e.day, sealedAt: e.sealed_at, entries: e.entries.map(x => ({ ...x, result: settle(x, boxFor(x, e.day)) })) }));
  return { days, summary: summarize(days.flatMap(d => d.entries.map(x => x.result))) };
}
