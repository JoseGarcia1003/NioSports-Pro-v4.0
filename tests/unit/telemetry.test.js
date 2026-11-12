import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('$lib/server/entitlements.js', () => ({ adminDatabase: vi.fn() }));
vi.mock('$lib/server/identity.js', () => ({ requireIdentity: vi.fn() }));
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { env } from '$env/dynamic/private';
import { cleanRoute, cleanMessage, parseTelemetry, isOwner, recordServerError } from '../../src/lib/server/telemetry.js';
import { POST } from '../../src/routes/api/telemetry/+server.js';
import { GET as health } from '../../src/routes/api/ops/health/+server.js';
import { healthChecks, vitalStatus } from '../../src/lib/product/ops-health.js';
import { errorReporter, deviceClass } from '../../src/lib/telemetry.js';

const rpc = vi.fn(async () => ({ data: true, error: null }));
beforeEach(() => { vi.clearAllMocks(); adminDatabase.mockReturnValue({ rpc }); });

describe('telemetry privacy and validation', () => {
  it('keeps only the route pattern', () => {
    expect(cleanRoute('/sports/nba/props?game=12#x')).toBe('/sports/nba/props');
    expect(cleanRoute('/tennis/player/[id]')).toBe('/tennis/player/[id]');
    expect(cleanRoute('/tennis/player/12345')).toBe('/tennis/player/[id]');
    expect(cleanRoute('https://evil.test/')).toBeNull();
    expect(cleanRoute('/<script>')).toBeNull();
  });
  it('removes emails, tokens and urls from messages', () => {
    expect(cleanMessage('fallo para ana@correo.com en https://x.test/a?b=1 con eyJa.eyJb.c1')).toBe('fallo para [email] en [url] con [token]');
    expect(cleanMessage('   ')).toBeNull();
    expect(cleanMessage('x'.repeat(500))).toHaveLength(300);
  });
  it('accepts valid vitals and errors and drops everything else', () => {
    const items = parseTelemetry(JSON.stringify([
      { kind: 'vital', metric: 'LCP', value: 812.4567, rating: 'good', route: '/', device: 'mobile', userId: 'leak' },
      { kind: 'vital', metric: 'FID', value: 1, rating: 'good', route: '/', device: 'mobile' },
      { kind: 'vital', metric: 'CLS', value: -1, rating: 'good', route: '/', device: 'mobile' },
      { kind: 'error', route: '/today', message: 'TypeError: x' },
      { kind: 'other' }
    ]));
    expect(items).toEqual([
      { kind: 'vital', row: { metric: 'LCP', value: 812.457, rating: 'good', route: '/', device: 'mobile' } },
      { kind: 'error', row: { source: 'client', route: '/today', message: 'TypeError: x', status: '' } }
    ]);
    expect(parseTelemetry('{')).toEqual([]);
    expect(parseTelemetry('x'.repeat(3000))).toEqual([]);
  });
  it('stores valid items through the throttled function and always answers 204', async () => {
    const req = body => ({ request: new Request('http://x/api/telemetry', { method: 'POST', body }) });
    const res = await POST(req(JSON.stringify({ kind: 'vital', metric: 'INP', value: 120, rating: 'good', route: '/today', device: 'desktop' })));
    expect(res.status).toBe(204);
    expect(rpc).toHaveBeenCalledWith('telemetry_insert', { p_kind: 'vital', p_row: { metric: 'INP', value: 120, rating: 'good', route: '/today', device: 'desktop' } });
    rpc.mockClear();
    expect((await POST(req('basura'))).status).toBe(204);
    expect(rpc).not.toHaveBeenCalled();
    adminDatabase.mockImplementation(() => { throw new Error('db down'); });
    expect((await POST(req(JSON.stringify({ kind: 'error', route: '/', message: 'x' })))).status).toBe(204);
  });
  it('records server errors without ever throwing', async () => {
    await recordServerError({ rpc }, { route: '/api/nba/props', message: 'boom for a@b.co', status: 500 });
    expect(rpc).toHaveBeenCalledWith('telemetry_insert', { p_kind: 'error', p_row: { source: 'server', route: '/api/nba/props', message: 'boom for [email]', status: '500' } });
    await expect(recordServerError({ rpc: async () => { throw new Error('x'); } }, { route: null, message: null })).resolves.toBeUndefined();
  });
});

describe('owner health panel', () => {
  it('recognises owners from the comma-separated list only', () => {
    expect(isOwner('abc', 'x, abc ,y')).toBe(true);
    expect(isOwner('ab', 'abc')).toBe(false);
    expect(isOwner('abc', undefined)).toBe(false);
    expect(isOwner('', '')).toBe(false);
  });
  it('answers 403 to non-owners and the summary to the owner', async () => {
    requireIdentity.mockResolvedValue({ uid: 'u1' });
    env.OWNER_USER_IDS = 'owner1';
    await expect(health({ request: new Request('http://x') })).rejects.toMatchObject({ status: 403 });
    requireIdentity.mockResolvedValue({ uid: 'owner1' });
    rpc.mockResolvedValueOnce({ data: { errors24h: 0 }, error: null });
    const res = await health({ request: new Request('http://x') });
    expect(res.status).toBe(200);
    expect((await res.json()).errors24h).toBe(0);
    expect(rpc).toHaveBeenCalledWith('ops_health');
    delete env.OWNER_USER_IDS;
  });
  it('rates vitals with Google thresholds', () => {
    expect(vitalStatus('LCP', 2400)).toBe('good');
    expect(vitalStatus('INP', 350)).toBe('needs-improvement');
    expect(vitalStatus('CLS', 0.3)).toBe('poor');
    expect(vitalStatus('FID', 1)).toBe('');
  });
  it('turns the summary into checks with clear levels', () => {
    const now = Date.parse('2026-11-04T12:00:00Z'); // 62 h after the last ingest
    const checks = healthChecks({
      stats: { lastGame: '2026-10-31', lastIngest: '2026-11-01T21:50:00Z' },
      cache: [{ key: 'niosports:odds:nba:totals:v1', fetchedAt: '2026-11-04T10:00:00Z', quotaRemaining: 120 }],
      signals: { editions: 0 }, positions: 0, errors24h: 0
    }, now);
    const by = t => checks.find(c => c.title === t);
    expect(by('Estadísticas NBA')).toMatchObject({ level: 'bad' });
    expect(by('Estadísticas NBA').text).toContain('Sincronizar ahora');
    expect(by('Créditos The Odds API')).toMatchObject({ level: 'warn' });
    expect(by('Líneas de puntos de jugadores')).toMatchObject({ level: 'warn' });
    expect(by('Señales')).toMatchObject({ level: 'warn' });
    expect(by('Posiciones de jugadores')).toMatchObject({ level: 'warn' });
    expect(by('Errores')).toMatchObject({ level: 'ok' });
    const day2 = healthChecks({ stats: { lastGame: '2026-10-31', lastIngest: '2026-11-01T21:50:00Z' } }, Date.parse('2026-11-03T12:00:00Z'));
    expect(day2.find(c => c.title === 'Estadísticas NBA').level).toBe('warn'); // 38 h
  });
});

describe('client reporter', () => {
  it('deduplicates and caps errors per page', () => {
    const post = vi.fn(() => true);
    const report = errorReporter(() => '/today', post);
    report('a'); report('a'); report(''); for (const m of ['b', 'c', 'd', 'e', 'f', 'g']) report(m);
    expect(post).toHaveBeenCalledTimes(5);
    expect(post.mock.calls[0][0]).toEqual({ kind: 'error', route: '/today', message: 'a' });
    const scrub = vi.fn(() => true);
    errorReporter(() => '/', scrub)('fallo de ana@correo.com en https://x.test/a?t=1');
    expect(scrub.mock.calls[0][0].message).toBe('fallo de [email] en [url]');
  });
  it('classifies the device by viewport width', () => {
    expect(deviceClass(390)).toBe('mobile');
    expect(deviceClass(1440)).toBe('desktop');
  });
});
