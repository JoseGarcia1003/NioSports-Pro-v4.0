import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { requireIdentity } from '$lib/server/identity.js';
import { adminDatabase } from '$lib/server/entitlements.js';
import { supabaseStore } from '$lib/server/odds-cache.js';
import { signalFacts } from '$lib/ai/facts.js';
import { explain, aiConfig } from '$lib/ai/analyst.js';

const NO_STORE = { 'Cache-Control': 'no-store' };

// Explains one sealed signal with the AI analyst. Disabled until an AI provider
// is configured; results are cached per signal so each costs at most one call.
export async function POST({ request }) {
  await requireIdentity(request);
  const cfg = aiConfig(env);
  if (!cfg.enabled) return json({ status: 'disabled', reason: cfg.reason }, { status: 503, headers: NO_STORE });
  let body;
  try { body = await request.json(); } catch { error(400, 'Invalid JSON'); }
  const day = String(body?.day || ''), playerId = Number(body?.playerId), side = body?.side;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(playerId) || !['over', 'under'].includes(side)) error(400, 'Invalid request');
  const db = adminDatabase();
  const { data: edition } = await db.from('nba_signal_editions').select('day, entries').eq('day', day).maybeSingle();
  const entry = edition?.entries?.find(e => e.playerId === playerId && e.side === side);
  if (!entry) error(404, 'Signal not found');
  const store = supabaseStore(db);
  const key = `ai:explain:${day}:${playerId}:${side}`;
  const hit = await store.get(key).catch(() => null);
  if (hit) return json({ ...hit, cached: true }, { headers: NO_STORE });
  const { data: seal } = await db.from('prediction_seals').select('hash').eq('edition_key', `nba:points:${day}`).maybeSingle();
  try {
    const result = await explain(signalFacts(entry, { day, sealHash: seal?.hash ?? null }), { env });
    const payload = { ...result, generatedAt: new Date().toISOString(), note: 'Texto generado por IA y verificado automáticamente contra los datos del sistema.' };
    await store.put(key, payload).catch(() => {});
    return json(payload, { headers: NO_STORE });
  } catch { return json({ status: 'unavailable' }, { status: 502, headers: NO_STORE }); }
}
