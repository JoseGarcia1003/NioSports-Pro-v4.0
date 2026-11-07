// Provider adapters. Each adapter declares what it can supply, the environment
// variables it needs, how its readiness was established, and implements a
// fetch → normalise contract. `verified` is set only after a real production
// response has been checked; it is never inferred from code existing.
import { providerRequest } from '../core/http.js';
import { provenance } from '../core/contracts.js';

/** Readiness, from configuration only (no network). */
export function readiness(adapter, env, sport = null) {
  if (adapter.mode === 'fixture') return { state: 'fixture', label: 'Datos de prueba (solo desarrollo)' };
  if (adapter.mode === 'push') return { state: adapter.verified ? 'live' : 'implemented', label: adapter.verified ? 'Conectado (envío propio)' : 'Implementado, sin verificar' };
  const missing = adapter.env.filter(k => !env[k]);
  if (missing.length) return { state: 'awaiting_credentials', label: 'Pendiente de credenciales', missing };
  // Verification is per sport: a provider proven for NBA is not proven for football.
  const verified = adapter.verified && (!adapter.verifiedFor || !sport || adapter.verifiedFor.includes(sport));
  return verified ? { state: 'live', label: 'Conectado y verificado' } : { state: 'configured_unverified', label: 'Configurado; falta verificar respuestas reales' };
}

const balldontlieStatus = s => (/final/i.test(s || '') ? 'final' : /qtr|half|ot/i.test(s || '') ? 'live' : 'scheduled');

export const ADAPTERS = Object.freeze({
  balldontlie: {
    id: 'balldontlie', sport: ['nba'], kinds: ['schedule', 'results'], tier: 'free', env: ['BALLDONTLIE_API_KEY'], verified: true,
    docs: 'https://docs.balldontlie.io', limits: { capacity: 5, perMs: 60000 },
    async schedule(day, { env, fetchImpl, log, limiter } = {}) {
      const { body } = await providerRequest(`https://api.balldontlie.io/v1/games?dates[]=${day}&per_page=100`, { provider: 'balldontlie', headers: { Authorization: env.BALLDONTLIE_API_KEY }, fetchImpl, log, limiter });
      const at = Date.now();
      return (body?.data || []).map(g => ({ id: `nba:bdl:${g.id}`, sport: 'nba', startsAt: g.datetime || g.date, status: balldontlieStatus(g.status),
        home: { id: g.home_team?.abbreviation, name: g.home_team?.full_name }, away: { id: g.visitor_team?.abbreviation, name: g.visitor_team?.full_name },
        score: { home: g.home_team_score ?? null, away: g.visitor_team_score ?? null }, provenance: provenance('balldontlie', at, { externalId: String(g.id) }) }));
    }
  },
  'nba-stats-ingest': {
    id: 'nba-stats-ingest', sport: ['nba'], kinds: ['boxscores'], tier: 'free', env: ['INGEST_SECRET'], mode: 'push', verified: true,
    docs: 'static/tools/nio_nba_stats.py (envío al endpoint /api/ingest/nba-player-games)'
  },
  'the-odds-api': {
    id: 'the-odds-api', sport: ['nba', 'football', 'mlb'], kinds: ['odds'], tier: 'free_500_credits', env: ['ODDS_API_KEY'], verified: true, verifiedFor: ['nba'],
    docs: 'https://the-odds-api.com/liveapi/guides/v4/', note: 'Verificado para NBA (totales y puntos de jugador). Fútbol y MLB usan la misma API pero no se han verificado.'
  },
  'football-data': {
    id: 'football-data', sport: ['football'], kinds: ['schedule', 'results'], tier: 'free_registration', env: ['FOOTBALL_DATA_API_KEY'], verified: false,
    docs: 'https://www.football-data.org/documentation/quickstart', limits: { capacity: 10, perMs: 60000 },
    async schedule(day, { env, fetchImpl, log, limiter } = {}) {
      const { body } = await providerRequest(`https://api.football-data.org/v4/matches?dateFrom=${day}&dateTo=${day}`, { provider: 'football-data', headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY }, fetchImpl, log, limiter });
      const at = Date.now();
      const st = s => ({ SCHEDULED: 'scheduled', TIMED: 'scheduled', IN_PLAY: 'live', PAUSED: 'live', FINISHED: 'final', POSTPONED: 'postponed', CANCELLED: 'cancelled' }[s] || 'unknown');
      return (body?.matches || []).map(m => ({ id: `football:fd:${m.id}`, sport: 'football', startsAt: m.utcDate, status: st(m.status), competition: m.competition?.name ?? null,
        home: { id: String(m.homeTeam?.id ?? ''), name: m.homeTeam?.name }, away: { id: String(m.awayTeam?.id ?? ''), name: m.awayTeam?.name },
        score: { home: m.score?.fullTime?.home ?? null, away: m.score?.fullTime?.away ?? null }, provenance: provenance('football-data', at, { externalId: String(m.id) }) }));
    }
  },
  'api-football': {
    id: 'api-football', sport: ['football'], kinds: ['schedule', 'results', 'boxscores', 'injuries', 'lineups'], tier: 'paid_or_free_trial', env: ['API_FOOTBALL_KEY'], verified: false,
    docs: 'https://www.api-football.com/documentation-v3', limits: { capacity: 10, perMs: 60000 },
    async schedule(day, { env, fetchImpl, log, limiter } = {}) {
      const { body } = await providerRequest(`https://v3.football.api-sports.io/fixtures?date=${day}`, { provider: 'api-football', headers: { 'x-apisports-key': env.API_FOOTBALL_KEY }, fetchImpl, log, limiter });
      const at = Date.now();
      const st = s => (['FT', 'AET', 'PEN'].includes(s) ? 'final' : ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(s) ? 'live' : ['NS', 'TBD'].includes(s) ? 'scheduled' : s === 'PST' ? 'postponed' : ['CANC', 'ABD'].includes(s) ? 'cancelled' : 'unknown');
      return (body?.response || []).map(f => ({ id: `football:af:${f.fixture?.id}`, sport: 'football', startsAt: f.fixture?.date, status: st(f.fixture?.status?.short), competition: f.league?.name ?? null,
        home: { id: String(f.teams?.home?.id ?? ''), name: f.teams?.home?.name }, away: { id: String(f.teams?.away?.id ?? ''), name: f.teams?.away?.name },
        score: { home: f.goals?.home ?? null, away: f.goals?.away ?? null }, provenance: provenance('api-football', at, { externalId: String(f.fixture?.id) }) }));
    }
  },
  'mlb-statsapi': {
    id: 'mlb-statsapi', sport: ['mlb'], kinds: ['schedule', 'results', 'boxscores'], tier: 'free_public', env: [], verified: false,
    docs: 'https://statsapi.mlb.com/api/v1/schedule (API pública de MLB; revisar sus términos antes de uso comercial)', limits: { capacity: 30, perMs: 60000 },
    async schedule(day, { fetchImpl, log, limiter } = {}) {
      const { body } = await providerRequest(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${day}`, { provider: 'mlb-statsapi', fetchImpl, log, limiter });
      const at = Date.now();
      const st = s => (/final|game over|completed/i.test(s || '') ? 'final' : /in progress|manager challenge|delayed/i.test(s || '') ? 'live' : /postponed/i.test(s || '') ? 'postponed' : /cancel/i.test(s || '') ? 'cancelled' : /scheduled|pre-game|warmup/i.test(s || '') ? 'scheduled' : 'unknown');
      return (body?.dates || []).flatMap(d => d.games || []).map(g => ({ id: `mlb:mlb:${g.gamePk}`, sport: 'mlb', startsAt: g.gameDate, status: st(g.status?.detailedState),
        home: { id: String(g.teams?.home?.team?.id ?? ''), name: g.teams?.home?.team?.name }, away: { id: String(g.teams?.away?.team?.id ?? ''), name: g.teams?.away?.team?.name },
        score: { home: g.teams?.home?.score ?? null, away: g.teams?.away?.score ?? null }, provenance: provenance('mlb-statsapi', at, { externalId: String(g.gamePk) }) }));
    }
  },
  'tennis-feed': {
    id: 'tennis-feed', sport: ['tennis'], kinds: ['schedule', 'results'], tier: 'to_be_contracted', env: ['TENNIS_FEED_URL', 'TENNIS_API_KEY', 'TENNIS_PROVIDER_ID'], verified: false,
    docs: 'Contrato propio de dataset validado en src/lib/tennis/domain.js (validateDataset). Requiere un proveedor que lo entregue.'
  },
  fixture: {
    id: 'fixture', sport: ['nba', 'football', 'tennis', 'mlb'], kinds: ['schedule'], tier: 'none', env: [], mode: 'fixture', verified: false,
    docs: 'Datos de prueba deterministas, marcados isDemo. Rechazados en producción.',
    async schedule(day, { sport = 'football', env = {} } = {}) {
      if (env.VERCEL_ENV === 'production') throw new Error('fixture_provider_forbidden_in_production');
      const at = Date.now();
      return [0, 1].map(i => ({ id: `${sport}:fixture:${day}:${i}`, sport, isDemo: true, startsAt: `${day}T${18 + i * 2}:00:00.000Z`, status: 'scheduled',
        home: { id: `H${i}`, name: `Local de prueba ${i + 1}` }, away: { id: `A${i}`, name: `Visitante de prueba ${i + 1}` }, score: null,
        provenance: provenance('fixture', at, { demo: true }) }));
    }
  }
});

export const adapter = id => ADAPTERS[id] || null;
