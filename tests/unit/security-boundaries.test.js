// Deterministic fixtures only: no provider requests or real writes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

const state = vi.hoisted(() => ({ env: {}, createClient: vi.fn(), sendWelcomeEmail: vi.fn() }));
vi.mock('$env/dynamic/private', () => ({ env: state.env }));
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_FIREBASE_PROJECT_ID: 'fixture-project' } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: state.createClient }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const key of Object.keys(state.env)) delete state.env[key];
  Object.assign(state.env, { STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture' });
});

const routes = import.meta.glob('../../src/routes/api/**/+server.js');

// Every scheduled-job endpoint must reject callers without the exact job secret
// before touching the database or any provider.
const endpoints = [['cron/daily', 'GET'], ['tennis/sync', 'POST'], ['ingest/nba-player-games', 'POST'], ['ingest/nba-players', 'POST']];
const statusOf = async promise => { try { return (await promise).status; } catch (e) { return e?.status; } };

describe.each(endpoints)('%s authorization', (path, method) => {
  it.each([undefined, '', 'undefined', 'wrong'])('rejects missing configuration and header %s', async (token) => {
    const route = await routes[`../../src/routes/api/${path}/+server.js`]();
    const headers = token === undefined ? {} : { authorization: `Bearer ${token}` };
    expect(await statusOf(route[method]({ request: new Request('https://fixture.test', { method, headers, body: method === 'POST' ? '{}' : undefined }) }))).toBe(401);
    expect(state.createClient).not.toHaveBeenCalled();
  });
  it('rejects a wrong token when configured', async () => {
    state.env.CRON_SECRET = 'configured-secret-configured-secret';
    state.env.INGEST_SECRET = 'configured-secret-configured-secret';
    const route = await routes[`../../src/routes/api/${path}/+server.js`]();
    expect(await statusOf(route[method]({ request: new Request('https://fixture.test', { method, headers: { authorization: 'Bearer wrong' }, body: method === 'POST' ? '{}' : undefined }) }))).toBe(401);
    expect(state.createClient).not.toHaveBeenCalled();
  });
});

describe('owner-only operations', () => {
  it('refuses the on-demand sync without a verified identity', async () => {
    const route = await routes['../../src/routes/api/ops/sync/+server.js']();
    expect(await statusOf(route.POST({ request: new Request('https://fixture.test', { method: 'POST' }) }))).toBe(401);
    expect(state.createClient).not.toHaveBeenCalled();
  });
});

describe('Stripe webhook boundary', () => {
  async function invoke(body, signature) {
    const { POST } = await import('../../src/routes/api/stripe/webhooks/+server.js');
    return POST({ request: new Request('https://fixture.test', {
      method: 'POST', body, headers: signature ? { 'stripe-signature': signature } : {},
    }) });
  }
  it.each([undefined, 'invalid'])('rejects unsigned/invalid payloads: %s', async (signature) => {
    expect((await invoke('{}', signature)).status).toBe(400);
    expect(state.createClient).not.toHaveBeenCalled();
  });
  it('fails closed without a webhook secret', async () => {
    delete state.env.STRIPE_WEBHOOK_SECRET;
    expect((await invoke('{}')).status).toBe(503);
    expect(state.createClient).not.toHaveBeenCalled();
  });
  it('verifies the original body with the real Stripe verifier', async () => {
    const body = JSON.stringify({ id: 'evt_fixture', type: 'fixture.unhandled', data: { object: {} } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fixture' });
    expect((await invoke(body, signature)).status).toBe(200);
    expect((await invoke(body + ' ', signature)).status).toBe(400);
  });
  it('returns 500 for failed database writes so Stripe can retry', async () => {
    const failure = vi.fn().mockRejectedValue(new Error('fixture write failure'));
    state.env.VITE_SUPABASE_URL = 'https://fixture.test';
    state.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture';
    state.createClient.mockReturnValue({ rpc: async () => ({ error: new Error('fixture failure') }) });
    const body = JSON.stringify({ id: 'evt_fixture', type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_fixture', customer: 'cus_fixture', status: 'canceled', metadata: { userId: 'fixture-user' } } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_fixture' });
    const response = await invoke(body, signature);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Webhook processing failed' });
  });
});
