import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';
vi.mock('$lib/server/identity.js', () => ({ requireIdentity: vi.fn() }));
vi.mock('$lib/server/entitlements.js', () => ({ adminDatabase: vi.fn() }));
import { requireIdentity } from '$lib/server/identity.js';
import { adminDatabase } from '$lib/server/entitlements.js';
import { GET, POST } from '../../src/routes/api/bankroll/+server.js';
const rpc = vi.fn();
const request = body => new Request('http://localhost/api/bankroll', { method: 'POST', headers: { 'Content-Type':'application/json', 'Idempotency-Key':'operation-1234567890' }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); requireIdentity.mockResolvedValue({uid:'verified'}); adminDatabase.mockReturnValue({rpc}); rpc.mockResolvedValue({data:{wallet:{}},error:null}); });
describe('Bankroll API boundary', () => {
  it('rejects anonymous reads and writes before database access', async () => {
    requireIdentity.mockImplementation(() => { throw error(401,'Unauthorized'); });
    await expect(GET({request:new Request('http://localhost')})).rejects.toMatchObject({status:401});
    await expect(POST({request:request({})})).rejects.toMatchObject({status:401});
    expect(adminDatabase).not.toHaveBeenCalled();
  });
  it('uses verified identity and never a body user ID', async () => {
    const response = await POST({request:request({userId:'victim',type:'deposit',amountMinor:100})});
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('bankroll_apply',expect.objectContaining({p_user:'verified',p_amount:100}));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it.each([null,{}, {type:'deposit',amountMinor:1.2}, {type:'withdraw',amountMinor:-1}])('rejects malformed operation %j', async body => {
    expect((await POST({request:request(body)})).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('returns conflict without leaking database errors', async () => {
    rpc.mockResolvedValue({error:{message:'internal secret'},data:null});
    const response = await POST({request:request({type:'withdraw',amountMinor:100})});
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain('internal secret');
  });
});
