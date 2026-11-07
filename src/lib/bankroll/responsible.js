// Responsible-use rules for the personal bankroll log. Pure functions so the
// server enforces exactly what the tests describe. Amounts are minor units.
//  - Tightening a limit applies at once; loosening waits a 24 h cooling-off.
//  - A pause blocks new stakes until it ends and cannot be shortened.
//  - Alerts describe behaviour; they never suggest staking more.
export const COOLING_OFF_MS = 24 * 3600e3;
export const LIMIT_FIELDS = ['maxStakeMinor', 'dailyStakeMinor', 'weeklyLossMinor'];

/** Effective limits at `now` from stored state { current, pending, pendingFrom, pauseUntil }. */
export function effectiveLimits(state, now = Date.now()) {
  const current = { ...(state?.current || {}) };
  if (state?.pending && Date.parse(state.pendingFrom) <= now) Object.assign(current, state.pending);
  return { ...current, pauseUntil: state?.pauseUntil && Date.parse(state.pauseUntil) > now ? state.pauseUntil : null };
}

const looser = (oldV, newV) => (oldV == null ? false : newV == null || newV > oldV);

/** Applies a requested change; returns the new stored state and what was deferred. */
export function requestLimits(state, request, now = Date.now()) {
  const eff = effectiveLimits(state, now);
  const current = { ...(state?.current || {}), ...Object.fromEntries(LIMIT_FIELDS.filter(f => f in eff).map(f => [f, eff[f]])) };
  const pending = {}, applied = {};
  for (const f of LIMIT_FIELDS) {
    if (!(f in request)) continue;
    const v = request[f] == null ? null : Number(request[f]);
    if (v != null && (!Number.isSafeInteger(v) || v <= 0 || v > 100000000)) throw new RangeError(`invalid_${f}`);
    if (looser(current[f], v)) pending[f] = v; else { current[f] = v; applied[f] = v; }
  }
  let pauseUntil = eff.pauseUntil;
  if (request.pauseDays != null) {
    const d = Number(request.pauseDays);
    if (![1, 7, 30, 90].includes(d)) throw new RangeError('invalid_pause');
    const until = new Date(now + d * 86400e3).toISOString();
    // A pause can only be extended, never shortened.
    if (!pauseUntil || Date.parse(until) > Date.parse(pauseUntil)) pauseUntil = until;
  }
  const hasPending = Object.keys(pending).length > 0;
  return { state: { current, pending: hasPending ? pending : null, pendingFrom: hasPending ? new Date(now + COOLING_OFF_MS).toISOString() : null, pauseUntil }, applied, deferred: pending };
}

const DAY = 86400e3;
const profitOf = t => (t.status === 'win' ? Math.round(t.stake_minor * (Number(t.odds) - 1)) : t.status === 'loss' ? -t.stake_minor : 0);

/** Checks a new stake against the limits; tickets: the user's recent tickets. */
export function checkStake(amountMinor, limits, tickets, now = Date.now()) {
  if (limits.pauseUntil) return { allowed: false, reason: 'paused', until: limits.pauseUntil };
  if (limits.maxStakeMinor && amountMinor > limits.maxStakeMinor) return { allowed: false, reason: 'max_stake', limit: limits.maxStakeMinor };
  const today = tickets.filter(t => now - Date.parse(t.created_at) < DAY).reduce((s, t) => s + t.stake_minor, 0);
  if (limits.dailyStakeMinor && today + amountMinor > limits.dailyStakeMinor) return { allowed: false, reason: 'daily_stake', limit: limits.dailyStakeMinor, used: today };
  const weekLoss = -tickets.filter(t => now - Date.parse(t.created_at) < 7 * DAY).reduce((s, t) => s + profitOf(t), 0);
  if (limits.weeklyLossMinor && weekLoss >= limits.weeklyLossMinor) return { allowed: false, reason: 'weekly_loss', limit: limits.weeklyLossMinor, used: weekLoss };
  return { allowed: true };
}

/** Behavioural alerts from recent tickets (newest first or any order). */
export function riskAlerts(tickets, now = Date.now()) {
  const list = [...tickets].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const alerts = [];
  const settled = list.filter(t => ['win', 'loss'].includes(t.status));
  let streak = 0;
  for (let i = settled.length - 1; i >= 0 && settled[i].status === 'loss'; i--) streak++;
  if (streak >= 3) alerts.push({ id: 'loss_streak', level: 'warning', text: `Llevas ${streak} tickets perdidos seguidos. Es un buen momento para parar y revisar.` });
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1], cur = list[i];
    // Typical stake BEFORE this ticket (the ticket itself must not hide the jump).
    const before = list.slice(0, i).map(t => t.stake_minor).sort((a, b) => a - b);
    const median = before[Math.floor((before.length - 1) / 2)];
    if (prev.status === 'loss' && Date.parse(cur.created_at) - Date.parse(prev.created_at) < 3600e3 && cur.stake_minor >= 1.5 * Math.max(median, prev.stake_minor) && now - Date.parse(cur.created_at) < 7 * DAY) {
      alerts.push({ id: 'chasing', level: 'warning', text: 'Subiste el importe poco después de una pérdida. Perseguir pérdidas aumenta el riesgo; considera una pausa.' });
      break;
    }
  }
  const last7 = list.filter(t => now - Date.parse(t.created_at) < 7 * DAY).reduce((s, t) => s + t.stake_minor, 0);
  const prior = list.filter(t => now - Date.parse(t.created_at) >= 7 * DAY && now - Date.parse(t.created_at) < 35 * DAY).reduce((s, t) => s + t.stake_minor, 0) / 4;
  if (prior > 0 && last7 > 2 * prior) alerts.push({ id: 'escalation', level: 'info', text: 'Esta semana registraste más del doble de importe que tu media semanal del último mes.' });
  return alerts;
}
