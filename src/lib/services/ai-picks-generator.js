import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
import { calculateEV } from '$lib/engine/probability.js';

const PERIODS = ['Q1', 'HALF', 'FULL'];
const positive = value => Number.isFinite(value) && value > 0;
const abortIfNeeded = signal => { if (signal?.aborted) throw new DOMException('Carga cancelada.', 'AbortError'); };

function completeStats(stats, period, venue) {
  if (!stats || typeof stats !== 'object') return false;
  const key = period.toLowerCase();
  const keys = [key, `${key}${venue}`, `${key}Last5`, `${key}Last10`, `${key}Season`];
  if (keys.some(k => stats[k] !== undefined && !positive(stats[k]))) return false;
  return positive(stats[key]) || positive(stats[`${key}${venue}`]) ||
    [`${key}Last5`, `${key}Last10`, `${key}Season`].every(k => positive(stats[k]));
}

function teamContext(game, side) {
  const context = game.context?.[side];
  const result = {};
  if (Number.isInteger(context?.restDays) && context.restDays >= 0 && context.restDays <= 60) result.restDays = context.restDays;
  if (Array.isArray(context?.injuries) && context.injuries.every(i =>
    typeof i?.name === 'string' && i.name.trim() && ['star', 'starter', 'rotation'].includes(i.type))) {
    result.injuries = context.injuries.map(({ name, type }) => ({ name, type }));
  }
  return result;
}

function upcoming(game, now) {
  if (!game || game.id == null || game.isDemo || game.isFinal || game.isLive ||
    /final|cancel|postpon|suspend|in.progress|live/i.test(game.status || '') ||
    game.homeScore > 0 || game.awayScore > 0) return false;
  if (typeof game.homeTeam !== 'string' || typeof game.awayTeam !== 'string' ||
    !game.homeTeam.trim() || !game.awayTeam.trim() || game.homeTeam.trim().toLowerCase() === game.awayTeam.trim().toLowerCase()) return false;
  if (game.startAt != null && (!Number.isFinite(Date.parse(game.startAt)) || Date.parse(game.startAt) <= now)) return false;
  return true;
}

async function generatePrediction(game, period, teamStats, signal) {
  const { homeTeam, awayTeam } = game;
  const marketLine = game.lines?.[period];
  if (!positive(marketLine) || !completeStats(teamStats[homeTeam], period, 'Home') ||
    !completeStats(teamStats[awayTeam], period, 'Away')) return null;
  abortIfNeeded(signal);
  const homeContext = teamContext(game, 'home');
  const awayContext = teamContext(game, 'away');
  const response = await authenticatedFetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    body: JSON.stringify({
      homeTeam: { name: homeTeam, stats: teamStats[homeTeam], ...homeContext },
      awayTeam: { name: awayTeam, stats: teamStats[awayTeam], ...awayContext },
      line: marketLine,
      period,
      gameInfo: typeof game.arena === 'string' ? { arena: game.arena } : {},
    }),
  });
  abortIfNeeded(signal);
  if (!response.ok) {
    const message = response.status === 429 ? 'Alcanzaste el límite de análisis de tu plan. Inténtalo cuando se renueve.' :
      [401, 403].includes(response.status) ? 'Tu sesión no permite continuar. Inicia sesión de nuevo.' :
      'El servicio de análisis no está disponible. Inténtalo de nuevo.';
    throw new Error(message);
  }
  const prediction = await response.json();
  abortIfNeeded(signal);
  if (!prediction || !positive(prediction.projection) || prediction.line !== marketLine || prediction.period !== period ||
    !Number.isFinite(prediction.edge) || Math.abs(prediction.edge - (prediction.projection - marketLine)) > 0.11 ||
    !Number.isFinite(prediction.probability) || prediction.probability < 0 || prediction.probability > 1 ||
    !['OVER', 'UNDER'].includes(prediction.direction) ||
    !['HIGH', 'MEDIUM', 'LOW'].includes(prediction.confidence) ||
    typeof prediction.modelVersion !== 'string' || !prediction.modelVersion.trim() ||
    (prediction.direction === 'OVER' ? prediction.edge < 0 : prediction.edge > 0)) {
    throw new Error('El servicio devolvió un análisis inconsistente. No se publicaron resultados.');
  }

  // The API's legacy EV assumes -110. Only use an observed price for this selection.
  const quote = game.odds?.[period]?.[prediction.direction];
  const odds = Number.isFinite(quote) && Math.abs(quote) >= 100 ? quote : null;
  const valuation = odds === null ? { ev: null, evPercent: null } : calculateEV(prediction.probability, odds);
  return {
    ...prediction,
    ev: valuation.ev,
    evPercent: valuation.evPercent,
    odds,
    isValueBet: odds !== null && valuation.evPercent > 0,
    probabilityPercent: Math.round(prediction.probability * 1000) / 10,
    gameId: game.id,
    homeTeam,
    awayTeam,
    homeTeamFull: game.homeTeamFull,
    awayTeamFull: game.awayTeamFull,
    period,
    marketLine,
    gameTime: game.time,
    gameDate: game.date,
    isDemo: false,
    missingContext: [
      ...(homeContext.restDays === undefined || awayContext.restDays === undefined ? ['Descanso sin verificar'] : []),
      ...(homeContext.injuries === undefined || awayContext.injuries === undefined ? ['Lesiones sin verificar'] : []),
      ...(odds === null ? ['Cuota no disponible: EV sin calcular'] : []),
    ],
  };
}

/** Experimental analyses, not a calibrated daily betting catalogue. */
export async function generateAIPicks(games, teamStats, options = {}) {
  const { maxPicks = 8, minEV = 2, minEdge = 1.5, periods = PERIODS, signal, now = Date.now() } = options;
  abortIfNeeded(signal);
  if (!Array.isArray(games) || !teamStats || typeof teamStats !== 'object' ||
    !Number.isSafeInteger(maxPicks) || maxPicks <= 0 || !Number.isFinite(minEV) || minEV < 0 ||
    !Number.isFinite(minEdge) || minEdge < 0 || !Array.isArray(periods)) return [];
  const supportedPeriods = [...new Set(periods.filter(p => PERIODS.includes(p)))];
  const allPicks = [];
  const seen = new Set();
  for (const game of games) {
    abortIfNeeded(signal);
    if (!upcoming(game, now) || seen.has(String(game.id))) continue;
    seen.add(String(game.id));
    for (const period of supportedPeriods) {
      const prediction = await generatePrediction(game, period, teamStats, signal);
      if (!prediction) continue;
      const edge = Math.abs(prediction.edge);
      // A negative EV cannot be rescued by a large difference in points.
      const qualifies = prediction.odds === null ? edge >= minEdge : prediction.evPercent >= minEV && edge >= minEdge;
      if (qualifies) allPicks.push({ ...prediction, valueScore: edge, generatedAt: prediction.generatedAt || new Date(now).toISOString() });
    }
  }
  abortIfNeeded(signal);
  allPicks.sort((a, b) => b.valueScore - a.valueScore || String(a.gameId).localeCompare(String(b.gameId)) || a.period.localeCompare(b.period));
  return allPicks.slice(0, Math.min(maxPicks, 100)).map((pick, index) => ({ ...pick, rank: index + 1, isTopPick: index === 0, isFeatured: index < 3 }));
}

export function groupPicksByGame(picks) {
  const grouped = new Map();
  for (const pick of picks || []) {
    const key = pick.gameId ?? `${pick.gameDate}:${pick.homeTeam}:${pick.awayTeam}`;
    if (!grouped.has(key)) grouped.set(key, { homeTeam: pick.homeTeam, awayTeam: pick.awayTeam,
      homeTeamFull: pick.homeTeamFull, awayTeamFull: pick.awayTeamFull, gameTime: pick.gameTime, picks: [] });
    grouped.get(key).picks.push(pick);
  }
  return [...grouped.values()];
}

export function getPicksSummary(picks) {
  const rows = Array.isArray(picks) ? picks : [];
  const result = { total: rows.length, byPeriod: {}, byDirection: {}, byConfidence: {}, avgEV: null, avgEdge: 0, priced: 0 };
  let totalEV = 0;
  let totalEdge = 0;
  for (const pick of rows) {
    for (const [bucket, field] of [['byPeriod', 'period'], ['byDirection', 'direction'], ['byConfidence', 'confidence']]) {
      result[bucket][pick[field]] = (result[bucket][pick[field]] || 0) + 1;
    }
    if (Number.isFinite(pick.evPercent)) { totalEV += pick.evPercent; result.priced++; }
    if (Number.isFinite(pick.edge)) totalEdge += Math.abs(pick.edge);
  }
  result.avgEV = result.priced ? Math.round(totalEV / result.priced * 10) / 10 : null;
  result.avgEdge = rows.length ? Math.round(totalEdge / rows.length * 10) / 10 : 0;
  return result;
}
