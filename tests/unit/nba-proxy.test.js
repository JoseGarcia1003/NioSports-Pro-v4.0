import { describe, it, expect, vi, afterEach } from 'vitest';
import { env } from '$env/dynamic/private';
import { GET } from '../../src/routes/api/proxy/+server.js';

const call = (q = 'endpoint=%2Fgames') => GET({ url: new URL(`http://localhost/api/proxy?${q}`) });

describe('NBA proxy never invents games', () => {
  const original = env.BALLDONTLIE_API_KEY;
  afterEach(() => { env.BALLDONTLIE_API_KEY = original; vi.restoreAllMocks(); });

  it('answers 503 without data when no key is configured', async () => {
    env.BALLDONTLIE_API_KEY = '';
    const res = await call();
    expect(res.status).toBe(503);
    expect(res.headers.get('X-Data-Source')).toBe('unavailable');
    expect((await res.json()).data).toBeNull();
  });

  it('reports a rejected key instead of serving sample games', async () => {
    env.BALLDONTLIE_API_KEY = 'k';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call();
    expect(res.status).toBe(502);
    expect(res.headers.get('X-Upstream-Status')).toBe('401');
    const body = await res.json();
    expect(body.reason).toBe('unauthorized');
    expect(body.data).toBeNull();
  });

  it('passes provider data through and labels its source', async () => {
    env.BALLDONTLIE_API_KEY = 'k';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 7 }] }), { status: 200 }));
    const res = await call();
    expect(res.headers.get('X-Data-Source')).toBe('balldontlie');
    expect((await res.json()).data).toEqual([{ id: 7 }]);
  });

  it('rejects paths outside the allow list', async () => {
    const res = await call('endpoint=%2Fodds');
    expect(res.status).toBe(403);
  });
});
