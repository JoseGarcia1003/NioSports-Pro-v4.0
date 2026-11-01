import { describe, it, expect, vi, afterEach } from 'vitest';
import { env } from '$env/dynamic/private';
import { GET } from '../../src/routes/api/odds/status/+server.js';

describe('Odds API status check', () => {
  afterEach(() => { env.ODDS_API_KEY = ''; vi.restoreAllMocks(); });

  it('reports a missing key without calling the provider', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).configured).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns quota and NBA availability without exposing the key', async () => {
    env.ODDS_API_KEY = 'secret-key';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([{ key: 'basketball_nba', active: true }]), {
      status: 200, headers: { 'x-requests-remaining': '498', 'x-requests-used': '2' }
    }));
    const res = await GET();
    const text = await res.text();
    expect(text).not.toContain('secret-key');
    expect(JSON.parse(text)).toEqual({ configured: true, ok: true, nbaActive: true, quota: { remaining: 498, used: 2 } });
  });

  it('surfaces a rejected key', async () => {
    env.ODDS_API_KEY = 'bad';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const res = await GET();
    expect(res.status).toBe(502);
    expect((await res.json()).upstreamStatus).toBe(401);
  });
});
