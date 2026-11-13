// Everything the member dashboard needs in one request: today's sealed edition
// (read only — the scheduled job creates it), the settled record, the bankroll
// with its server-computed metrics, responsible-use state and data freshness.
// Each block degrades to null on its own; none of them is ever estimated.
import { readEdition } from './signal-edition.js';
import { settledHistory } from './signal-results.js';
import { limitsView } from './bankroll-limits.js';
import { gateEdition, gatingEnabled } from './access.js';
import { getEntitlements } from './entitlements.js';
import { dayFor } from './nba-props.js';
import { bankrollMetrics } from '$lib/bankroll/metrics.js';
import { freshness } from '$lib/sports/core/freshness.js';
import { SPORTS_CONFIG } from '$lib/sports/config.js';

const soft = async promise => { try { return await promise; } catch { return null; } };

async function editionBlock(db, env, uid, day) {
  const edition = await readEdition(db, day);
  if (!edition) return { sealed: false, count: 0, top: [], reason: null };
  const enabled = gatingEnabled(env);
  const plan = enabled ? (await getEntitlements(uid)).plan : null;
  const gated = gateEdition(edition, { plan, enabled }).edition;
  const { data: seal } = await db.from('prediction_seals').select('hash').eq('edition_key', `nba:points:${day}`).maybeSingle();
  return { sealed: true, count: edition.entries.length, sealedAt: edition.sealedAt, sealHash: seal?.hash ?? null,
    top: gated.entries.slice(0, 3).map(e => (e.locked ? e : { name: e.name, team: e.team, opponent: e.opponent, home: e.home, tipoff: e.tipoff, side: e.side, line: e.line, p: e.model?.p ?? null, interval80: e.model?.interval80 ?? null })) };
}

async function recordBlock(db, day) {
  const h = await settledHistory(db, day, 30);
  const lastSettled = h.days.find(d => d.entries.some(e => e.result.status !== 'pending'));
  const count = (d, s) => d.entries.filter(e => e.result.status === s).length;
  return { summary: h.summary, editions: h.days.length,
    lastDay: lastSettled ? { day: lastSettled.day, hits: count(lastSettled, 'hit'), misses: count(lastSettled, 'miss'), voids: count(lastSettled, 'void'), decided: count(lastSettled, 'hit') + count(lastSettled, 'miss') } : null };
}

async function bankrollBlock(db, uid) {
  const { data, error } = await db.rpc('bankroll_snapshot', { p_user: uid });
  if (error) throw new Error('bankroll');
  if (!data?.wallet) return { started: false, pendingTickets: 0 };
  const { data: tickets } = await db.from('bankroll_tickets').select('status, stake_minor, odds').eq('user_id', uid).limit(5000);
  const w = data.wallet;
  return { started: true, availableMinor: Number(w.available_minor || 0), reservedMinor: Number(w.reserved_minor || 0), profitMinor: Number(w.profit_minor || 0),
    pendingTickets: (data.tickets || []).length, metrics: bankrollMetrics(tickets || [], w),
    recent: (data.entries || []).slice(0, 4).map(e => ({ id: e.id, kind: e.kind, deltaMinor: Number(e.delta_minor), note: e.note, at: e.created_at })) };
}

async function dataBlock(db, day) {
  const { data, error } = await db.from('nba_player_games').select('game_date').order('game_date', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error('data');
  const through = data?.game_date ?? null;
  return { boxScoresThrough: through, fresh: freshness(SPORTS_CONFIG.nba.freshness.boxScores, through, day).usable };
}

export async function buildDashboard(db, uid, env, now = Date.now()) {
  const day = dayFor(0, now);
  const [edition, record, bankroll, limits, data] = await Promise.all([
    soft(editionBlock(db, env, uid, day)), soft(recordBlock(db, day)), soft(bankrollBlock(db, uid)), soft(limitsView(db, uid, now)), soft(dataBlock(db, day))
  ]);
  // Why there is no edition, without calling any provider from the dashboard.
  if (edition && !edition.sealed && data && !data.fresh) edition.reason = 'data_stale';
  return { day, generatedAt: new Date(now).toISOString(), edition, record, bankroll, limits: limits ? { pauseUntil: limits.limits.pauseUntil, alerts: limits.alerts } : null, data };
}
