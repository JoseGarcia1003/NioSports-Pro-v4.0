// @vitest-environment node
import { it, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import { providerRequest, rateLimiter, ProviderError } from '../../src/lib/sports/core/http.js';
import { validateEvent, partition, dedupe, provenance } from '../../src/lib/sports/core/contracts.js';
import { freshness } from '../../src/lib/sports/core/freshness.js';
import { ADAPTERS, readiness } from '../../src/lib/sports/providers/index.js';
import { sportReadiness, allReadiness } from '../../src/lib/sports/registry.js';
import { SPORTS_CONFIG } from '../../src/lib/sports/config.js';
import { syncSchedule } from '../../src/lib/server/sync.js';

const noSleep = async () => {};
const respond = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('resilient provider requests', () => {
  it('retries 5xx and 429, then succeeds; logs redact keys', async () => {
    const seq = [respond(503, {}), respond(429, {}), respond(200, { ok: 1 })]; const log = [];
    const r = await providerRequest('https://x.test/a?apiKey=SECRET', { provider: 'p', fetchImpl: async () => seq.shift(), sleep: noSleep, log: e => log.push(e) });
    expect(r.body).toEqual({ ok: 1 });
    expect(log.map(l => l.outcome)).toEqual(['retryable', 'retryable', 'ok']);
    expect(JSON.stringify(log)).not.toContain('SECRET');
  });
  it('does not retry auth errors and classifies them', async () => {
    let n = 0;
    await expect(providerRequest('https://x.test', { provider: 'p', fetchImpl: async () => { n++; return respond(401, {}); }, sleep: noSleep })).rejects.toMatchObject({ code: 'unauthorized' });
    expect(n).toBe(1);
  });
  it('gives up after bounded retries on network failure', async () => {
    let n = 0;
    await expect(providerRequest('https://x.test', { provider: 'p', retries: 2, fetchImpl: async () => { n++; throw new TypeError('fetch failed'); }, sleep: noSleep })).rejects.toBeInstanceOf(ProviderError);
    expect(n).toBe(3);
  });
  it('enforces a local request budget', async () => {
    let t = 0; const lim = rateLimiter({ capacity: 2, perMs: 1000, now: () => t });
    expect([lim.take(), lim.take(), lim.take()]).toEqual([true, true, false]);
    t = 500; expect(lim.take()).toBe(true);
    await expect(providerRequest('https://x', { provider: 'p', limiter: { take: () => false }, fetchImpl: async () => respond(200, {}) })).rejects.toMatchObject({ code: 'rate_limited' });
  });
});

const ev = (o = {}) => ({ id: 'mlb:x:1', sport: 'mlb', startsAt: '2026-09-15T23:05:00Z', status: 'scheduled', home: { name: 'A' }, away: { name: 'B' }, score: null, provenance: provenance('p', Date.now()), ...o });
describe('normalised contracts', () => {
  it('validates events and reports every issue', () => {
    expect(validateEvent(ev()).ok).toBe(true);
    expect(validateEvent(ev({ status: 'final', score: { home: 3, away: null } })).issues).toContain('final_without_score');
    expect(validateEvent(ev({ away: { name: 'A' } })).issues).toContain('same_participants');
    expect(validateEvent(ev({ provenance: null })).issues).toContain('provenance');
  });
  it('flags mostly broken batches as inconsistent and dedupes by freshest copy', () => {
    const p = partition([ev(), ev({ id: '' }), ev({ startsAt: 'x' })]);
    expect(p.valid).toHaveLength(1); expect(p.inconsistent).toBe(true);
    const old = ev({ provenance: provenance('p', 1000) }), fresh = ev({ status: 'live', provenance: provenance('p', 2000) });
    expect(dedupe([fresh, old])[0].status).toBe('live');
  });
});

describe('freshness', () => {
  it('marks stale, missing and fresh data', () => {
    expect(freshness({ maxAgeDays: 3 }, '2026-11-05', '2026-11-07').usable).toBe(true);
    expect(freshness({ maxAgeDays: 3 }, '2026-10-31', '2026-11-07')).toMatchObject({ usable: false, status: 'stale' });
    expect(freshness({ maxAgeDays: 3 }, null, '2026-11-07').status).toBe('missing');
  });
});

describe('adapters (shapes from the providers\' public documentation; real responses still to verify)', () => {
  it('normalises football-data, api-football and MLB schedules', async () => {
    const fd = await ADAPTERS['football-data'].schedule('2026-11-08', { env: { FOOTBALL_DATA_API_KEY: 'k' }, fetchImpl: async (url, init) => {
      expect(init.headers['X-Auth-Token']).toBe('k'); expect(url).toContain('dateFrom=2026-11-08');
      return respond(200, { matches: [{ id: 9, utcDate: '2026-11-08T15:00:00Z', status: 'FINISHED', competition: { name: 'Liga' }, homeTeam: { id: 1, name: 'Uno' }, awayTeam: { id: 2, name: 'Dos' }, score: { fullTime: { home: 2, away: 1 } } }] }); } });
    expect(fd[0]).toMatchObject({ id: 'football:fd:9', status: 'final', score: { home: 2, away: 1 } });
    expect(validateEvent(fd[0]).ok).toBe(true);
    const af = await ADAPTERS['api-football'].schedule('2026-11-08', { env: { API_FOOTBALL_KEY: 'k' }, fetchImpl: async () => respond(200, { response: [{ fixture: { id: 5, date: '2026-11-08T20:00:00+00:00', status: { short: 'NS' } }, league: { name: 'L' }, teams: { home: { id: 1, name: 'X' }, away: { id: 2, name: 'Y' } }, goals: { home: null, away: null } }] }) });
    expect(validateEvent(af[0]).ok).toBe(true); expect(af[0].status).toBe('scheduled');
    const mlb = await ADAPTERS['mlb-statsapi'].schedule('2026-09-15', { fetchImpl: async () => respond(200, { dates: [{ games: [{ gamePk: 77, gameDate: '2026-09-15T23:05:00Z', status: { detailedState: 'Final' }, teams: { home: { team: { id: 1, name: 'H' }, score: 4 }, away: { team: { id: 2, name: 'V' }, score: 3 } } }] }] }) });
    expect(mlb[0]).toMatchObject({ id: 'mlb:mlb:77', status: 'final' }); expect(validateEvent(mlb[0]).ok).toBe(true);
  });
  it('MLB adapter normalises a real statsapi response (15 final games on 2026-09-15)', async () => {
    const real = JSON.parse(readFileSync('tests/fixtures/mlb-schedule-2026-09-15.json', 'utf8'));
    const events = await ADAPTERS['mlb-statsapi'].schedule('2026-09-15', { fetchImpl: async () => respond(200, real) });
    expect(events).toHaveLength(15);
    expect(events.every(e => validateEvent(e).ok && e.status === 'final')).toBe(true);
    expect(events[0]).toMatchObject({ id: 'mlb:mlb:824466', startsAt: '2026-09-15T22:40:00Z', home: { name: 'Cincinnati Reds' }, away: { name: 'Los Angeles Dodgers' }, score: { home: 0, away: 4 } });
    expect(ADAPTERS['mlb-statsapi'].verified).toBe(true);
  });
  it('fixture data is marked demo and refused in production', async () => {
    const f = await ADAPTERS.fixture.schedule('2026-11-08', { sport: 'football', env: {} });
    expect(f.every(e => e.isDemo && e.provenance.provider === 'fixture')).toBe(true);
    await expect(ADAPTERS.fixture.schedule('2026-11-08', { env: { VERCEL_ENV: 'production' } })).rejects.toThrow();
  });
  it('readiness never claims a live connection without credentials and verification', () => {
    expect(readiness(ADAPTERS['football-data'], {}).state).toBe('awaiting_credentials');
    expect(readiness(ADAPTERS['football-data'], { FOOTBALL_DATA_API_KEY: 'k' }).state).toBe('configured_unverified');
    expect(readiness(ADAPTERS.balldontlie, { BALLDONTLIE_API_KEY: 'k' }).state).toBe('live');
    expect(sportReadiness('football', {}).overall).toBe('not_connected');
    expect(sportReadiness('nba', { BALLDONTLIE_API_KEY: 'k', ODDS_API_KEY: 'k', INGEST_SECRET: 's' }).overall).toBe('partial');
    // Regression: odds verified for NBA must not make football or MLB look connected.
    const keys = { ODDS_API_KEY: 'k' };
    expect(sportReadiness('football', keys).overall).toBe('not_connected');
    expect(sportReadiness('mlb', keys).kinds.find(k => k.kind === 'odds').state).toBe('unverified');
    expect(sportReadiness('mlb', {}).kinds.find(k => k.kind === 'schedule').state).toBe('live');
    expect(sportReadiness('nba', keys).kinds.find(k => k.kind === 'odds').state).toBe('live');
    expect(allReadiness({}).map(s => s.sport)).toEqual(['nba', 'football', 'tennis', 'mlb']);
    for (const cfg of Object.values(SPORTS_CONFIG)) for (const ids of Object.values(cfg.providers)) for (const id of ids) expect(ADAPTERS[id]).toBeTruthy();
  });
});

function fakeDb() { const runs = []; return { runs, from: () => ({ insert: async row => { runs.push(row); return { error: null }; } }) }; }
describe('sync service', () => {
  it('fails over to the next provider and records the run', async () => {
    const db = fakeDb();
    const fetchImpl = async url => url.includes('football-data') ? respond(500, {}) : respond(200, { response: [{ fixture: { id: 1, date: '2026-11-08T20:00:00Z', status: { short: 'NS' } }, teams: { home: { id: 1, name: 'X' }, away: { id: 2, name: 'Y' } }, goals: {} }] });
    const r = await syncSchedule(db, { sport: 'football', day: '2026-11-08', env: { FOOTBALL_DATA_API_KEY: 'a', API_FOOTBALL_KEY: 'b' }, fetchImpl });
    expect(r).toMatchObject({ status: 'ok', provider: 'api-football' }); expect(r.events).toHaveLength(1);
    expect(db.runs[0]).toMatchObject({ sport: 'football', provider: 'api-football', status: 'ok', records_valid: 1 });
    expect(db.runs[0].details.attempts[0]).toMatchObject({ id: 'football-data' });
  }, 20000);
  it('records a skipped run and returns nothing when no provider is configured', async () => {
    const db = fakeDb();
    const r = await syncSchedule(db, { sport: 'football', day: '2026-11-08', env: {}, fetchImpl: async () => { throw new Error('must not be called'); } });
    expect(r).toMatchObject({ status: 'skipped', events: [] }); expect(db.runs[0]).toMatchObject({ status: 'skipped', error_code: 'no_configured_provider' });
  });
});
