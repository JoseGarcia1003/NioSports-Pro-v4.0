import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('$lib/server/identity.js', () => ({ requireIdentity: vi.fn() }));
const stripeCtor = vi.fn();
vi.mock('stripe', () => ({ default: function Stripe(...args) { stripeCtor(...args); return {}; } }));
import { requireIdentity } from '$lib/server/identity.js';
import { env } from '$env/dynamic/private';
import { POST } from '../../src/routes/api/stripe/checkout/+server.js';

const request = () => new Request('http://x/api/stripe/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ priceId: 'price_pro' }) });

beforeEach(() => { vi.clearAllMocks(); requireIdentity.mockResolvedValue({ uid: 'u1', email: 'a@b.c' }); });
afterEach(() => { delete env.BILLING_ENABLED; });

describe('checkout during the open beta', () => {
  it('refuses to create a payment unless billing was explicitly enabled', async () => {
    const res = await POST({ request: request() });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'billing_disabled' });
    expect(stripeCtor).not.toHaveBeenCalled();
  });

  it('only reaches Stripe when BILLING_ENABLED is exactly "true"', async () => {
    env.BILLING_ENABLED = '1';
    expect((await POST({ request: request() })).status).toBe(503);
    expect(stripeCtor).not.toHaveBeenCalled();
    env.BILLING_ENABLED = 'true';
    const res = await POST({ request: request() });
    expect(stripeCtor).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(400); // unknown price: the gate is open, the rest still validates
  });

  it('still requires a session before anything else', async () => {
    requireIdentity.mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }));
    await expect(POST({ request: request() })).rejects.toThrow('unauthorized');
  });
});
