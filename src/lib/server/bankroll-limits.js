import { effectiveLimits, requestLimits, riskAlerts } from '$lib/bankroll/responsible.js';

export async function loadLimitState(db, uid) {
  const { data, error } = await db.from('bankroll_limits').select('state').eq('user_id', uid).maybeSingle();
  if (error) throw new Error('limits_unavailable');
  return data?.state || {};
}
export async function recentTickets(db, uid, now = Date.now()) {
  const since = new Date(now - 35 * 86400e3).toISOString();
  const { data, error } = await db.from('bankroll_tickets').select('stake_minor, odds, status, created_at').eq('user_id', uid).gte('created_at', since);
  if (error) throw new Error('tickets_unavailable');
  return data || [];
}
export async function limitsView(db, uid, now = Date.now()) {
  const state = await loadLimitState(db, uid);
  const tickets = await recentTickets(db, uid, now);
  return { limits: effectiveLimits(state, now), pending: state.pending || null, pendingFrom: state.pendingFrom || null, alerts: riskAlerts(tickets, now) };
}
export async function updateLimits(db, uid, request, now = Date.now()) {
  const state = await loadLimitState(db, uid);
  const r = requestLimits(state, request, now);
  const { error } = await db.from('bankroll_limits').upsert({ user_id: uid, state: r.state, updated_at: new Date(now).toISOString() });
  if (error) throw new Error('limits_write_failed');
  await db.from('bankroll_limit_events').insert({ user_id: uid, request, applied: r.applied, deferred: r.deferred });
  return r;
}
