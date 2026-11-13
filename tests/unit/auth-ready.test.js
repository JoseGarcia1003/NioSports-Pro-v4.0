import { it, expect, vi, beforeEach } from 'vitest';
import { authStore, whenAuthReady } from '../../src/lib/stores/auth.js';
import { authenticatedFetch } from '../../src/lib/services/authenticated-fetch.js';

beforeEach(() => { authStore.setLoading(true); vi.restoreAllMocks(); });

it('private requests wait for the session check instead of failing while it is pending', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  let settled = false;
  const pending = authenticatedFetch('/api/bankroll').then(r => { settled = true; return r; });
  await new Promise(r => setTimeout(r, 20));
  expect(settled).toBe(false); expect(fetchSpy).not.toHaveBeenCalled();
  authStore.setUser({ uid: 'u1', getIdToken: async () => 'token-1' });
  await pending;
  expect(new Headers(fetchSpy.mock.calls[0][1].headers).get('authorization')).toBe('Bearer token-1');
});

it('rejects once the check ends without a session, and never sends an unauthenticated request', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  const pending = authenticatedFetch('/api/bankroll');
  authStore.setUser(null);
  await expect(pending).rejects.toThrow('Inicia sesión');
  expect(fetchSpy).not.toHaveBeenCalled();
  await expect(whenAuthReady()).resolves.toBeUndefined();
});
