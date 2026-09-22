// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { Csp } from '../../node_modules/@sveltejs/kit/src/runtime/server/page/csp.js';
import svelteConfig from '../../svelte.config.js';

const pwa = vi.hoisted(() => ({ options: null }));
vi.mock('@sentry/sveltekit', () => ({ init: vi.fn(), handleErrorWithSentry: (handler) => handler }));
vi.mock('@sveltejs/kit/vite', () => ({ sveltekit: () => [] }));
vi.mock('@vite-pwa/sveltekit', () => ({ SvelteKitPWA: (options) => { pwa.options = options; return []; } }));

import { handle } from '../../src/hooks.server.js';
import '../../vite.config.js';

describe('response security', () => {
  it('keeps the SvelteKit nonce unique and unchanged through the server hook', async () => {
    const policies = [];
    for (let index = 0; index < 2; index += 1) {
      const csp = new Csp({ ...svelteConfig.kit.csp, reportOnly: {} }, { prerender: false });
      csp.add_script('startHydration()');
      const policy = csp.csp_provider.get_header();
      const response = await handle({
        event: { url: new URL('https://fixture.test/today') },
        resolve: async () => new Response('', { headers: { 'Content-Security-Policy': policy } })
      });
      expect(response.headers.get('Content-Security-Policy')).toBe(policy);
      expect(policy).toContain(`'nonce-${csp.nonce}'`);
      const scripts = policy.split('; ').find((directive) => directive.startsWith('script-src '));
      expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval/);
      policies.push(policy);
    }
    expect(policies[0]).not.toBe(policies[1]);
    const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    expect(vercel.headers.flatMap((rule) => rule.headers).some(({ key }) => key.toLowerCase() === 'content-security-policy')).toBe(false);
  });

  it.each(['/api/account', '/api/catalog', '/api/predict', '/api/bankroll'])('prevents persistent HTTP caching for %s', async (path) => {
    const response = await handle({
      event: { url: new URL(path, 'https://fixture.test') },
      resolve: async () => new Response('private response', {
        headers: { 'Cache-Control': 'public, max-age=300', Vary: 'Authorization' }
      })
    });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Authorization');
    expect(await response.text()).toBe('private response');
  });

  it('keeps static asset cache headers intact', async () => {
    const response = await handle({
      event: { url: new URL('https://fixture.test/_app/immutable/app.js') },
      resolve: async () => new Response('', { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } })
    });
    expect(response.headers.get('Cache-Control')).toContain('immutable');
  });
});

describe('service worker privacy', () => {
  function matchingRule(url, authorization) {
    const request = new Request(url, authorization ? { headers: { authorization } } : {});
    return pwa.options.workbox.runtimeCaching.find(({ urlPattern }) => typeof urlPattern === 'function'
      ? urlPattern({ url: new URL(url), request })
      : urlPattern.test(url));
  }

  it.each([
    ['https://fixture.test/api/predict'],
    ['https://fixture.test/api/catalog'],
    ['https://fixture.test/api/bankroll'],
    ['https://fixture.supabase.co/rest/v1/profiles', 'Bearer account-A']
  ])('never falls back to cached private data for %s', (url, authorization) => {
    const rule = matchingRule(url, authorization);
    expect(rule.handler).toBe('NetworkOnly');
    expect(rule.options.fetchOptions.cache).toBe('no-store');
    expect(rule.options.precacheFallback).toBeUndefined();
    expect(pwa.options.workbox.navigateFallback).toBeNull();
  });

  it('allows only font responses in the runtime cache', () => {
    expect(matchingRule('https://fonts.googleapis.com/css2?family=Inter').handler).toBe('CacheFirst');
    expect(matchingRule('https://fixture.test/data/private.json')).toBeUndefined();
    // Authorization takes precedence even for an otherwise cacheable URL.
    expect(matchingRule('https://fonts.googleapis.com/css2', 'Bearer account-A').handler).toBe('NetworkOnly');
  });

  it('deletes legacy response caches during activation and preserves static assets', async () => {
    const names = new Set(['predictions', 'nba-data', 'google-fonts', 'workbox-precache-v2']);
    let activate;
    let completion;
    const scriptUrl = pwa.options.workbox.importScripts[0];
    const script = readFileSync(new URL(`../../static${scriptUrl}`, import.meta.url), 'utf8');
    runInNewContext(script, {
      self: { addEventListener: (type, handler) => { if (type === 'activate') activate = handler; } },
      caches: { keys: async () => [...names], delete: async (name) => names.delete(name) }
    });
    activate({ waitUntil: (promise) => { completion = promise; } });
    await completion;
    expect([...names]).toEqual(['google-fonts', 'workbox-precache-v2']);
  });
});
