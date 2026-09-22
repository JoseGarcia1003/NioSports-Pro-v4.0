import { json } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { adminDatabase } from '$lib/server/entitlements.js';

export async function GET({ request }) {
  const { uid } = await requireIdentity(request);
  const db = adminDatabase();
  const { data, error } = await db.rpc('bankroll_snapshot', { p_user: uid });
  if (error) return json({ error: 'No se pudo cargar el registro contable. Verifica la migración.' }, { status: 503 });
  return json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST({ request }) {
  const { uid } = await requireIdentity(request);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Solicitud inválida' }, { status: 400 }); }
  const key = request.headers.get('idempotency-key');
  if (!key || !/^[a-zA-Z0-9-]{16,100}$/.test(key)) return json({ error: 'Identificador de operación requerido' }, { status: 400 });
  if (!body || typeof body !== 'object' || !['deposit', 'withdraw', 'stake', 'settle'].includes(body.type) ||
      !Number.isSafeInteger(body.amountMinor) || body.amountMinor < 0 || body.amountMinor > 100000000) {
    return json({ error: 'Tipo o importe inválido' }, { status: 400 });
  }
  const { data, error } = await adminDatabase().rpc('bankroll_apply', {
    p_user: uid, p_key: key, p_kind: body.type, p_amount: body.amountMinor,
    p_ticket: body.ticketId || null, p_odds: body.odds ?? null,
    p_outcome: body.outcome || null, p_note: String(body.note || '').slice(0, 500),
  });
  if (error) return json({ error: 'Operación rechazada. Revisa saldo, ticket e importe.' }, { status: 409 });
  return json(data, { headers: { 'Cache-Control': 'no-store' } });
}
