import { json } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { adminDatabase } from '$lib/server/entitlements.js';
import { loadLimitState, recentTickets } from '$lib/server/bankroll-limits.js';
import { effectiveLimits, checkStake } from '$lib/bankroll/responsible.js';
import { bankrollMetrics } from '$lib/bankroll/metrics.js';

export async function GET({ request }) {
  const { uid } = await requireIdentity(request);
  const db = adminDatabase();
  const { data, error } = await db.rpc('bankroll_snapshot', { p_user: uid });
  if (error) return json({ error: 'No se pudo cargar el registro contable. Verifica la migración.' }, { status: 503 });
  // Performance metrics are computed here, from every ticket, never in the browser.
  const { data: tickets, error: failure } = await db.from('bankroll_tickets').select('status, stake_minor, odds').eq('user_id', uid).limit(5000);
  return json({ ...data, metrics: failure ? null : bankrollMetrics(tickets || [], data?.wallet) }, { headers: { 'Cache-Control': 'no-store' } });
}

const LIMIT_MESSAGES = {
  paused: 'Tienes una pausa activa. No se pueden registrar nuevos tickets hasta que termine.',
  max_stake: 'El importe supera tu límite por ticket.',
  daily_stake: 'Este ticket superaría tu límite diario.',
  weekly_loss: 'Alcanzaste tu límite de pérdida semanal.'
};

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
  const db = adminDatabase();
  // Responsible-use limits are enforced here, on the server, before any stake is logged.
  if (body.type === 'stake') {
    let verdict;
    try { verdict = checkStake(body.amountMinor, effectiveLimits(await loadLimitState(db, uid)), await recentTickets(db, uid)); }
    catch { return json({ error: 'No se pudieron comprobar tus límites. Inténtalo de nuevo.' }, { status: 503 }); }
    if (!verdict.allowed) return json({ error: LIMIT_MESSAGES[verdict.reason], limit: verdict }, { status: 403 });
  }
  const { data, error } = await db.rpc('bankroll_apply', {
    p_user: uid, p_key: key, p_kind: body.type, p_amount: body.amountMinor,
    p_ticket: body.ticketId || null, p_odds: body.odds ?? null,
    p_outcome: body.outcome || null, p_note: String(body.note || '').slice(0, 500),
  });
  if (error) return json({ error: 'Operación rechazada. Revisa saldo, ticket e importe.' }, { status: 409 });
  return json(data, { headers: { 'Cache-Control': 'no-store' } });
}
