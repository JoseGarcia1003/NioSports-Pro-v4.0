// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
const remoteKeys = vi.hoisted(() => vi.fn());
vi.mock('jose', async importOriginal => ({
  ...await importOriginal(),
  // Keep JWT verification real; replace only the remote key download.
  createRemoteJWKSet: () => remoteKeys,
}));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
import { generateKeyPair, SignJWT } from 'jose';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { verifyFirebaseToken, requireIdentity } from '../../src/lib/server/identity.js';
import { effectivePlan } from '../../src/lib/server/entitlements.js';
let pair;
beforeAll(async()=>{pair=await generateKeyPair('RS256');});
beforeEach(() => {
  delete env.FIREBASE_PROJECT_ID;
  delete publicEnv.PUBLIC_FIREBASE_PROJECT_ID;
  remoteKeys.mockReset().mockResolvedValue(pair.publicKey);
});
async function token(overrides={}) {
  const now=Math.floor(Date.now()/1000);
  return new SignJWT({sub:'user-a',aud:'fixture-project',iss:'https://securetoken.google.com/fixture-project',iat:now,exp:now+3600,auth_time:now-60,...overrides})
    .setProtectedHeader({alg:'RS256',kid:'fixture'}).sign(pair.privateKey);
}
it('verifies signatures and extracts identity',async()=>{
  expect(await verifyFirebaseToken(await token(),'fixture-project',pair.publicKey)).toEqual({uid:'user-a',email:undefined});
});
it.each([{aud:'foreign-project'},{iss:'https://evil.test'},{exp:1},{sub:''},{auth_time:9999999999},{iat:9999999999}])('rejects invalid claims %j',async claims=>{
  await expect(verifyFirebaseToken(await token(claims),'fixture-project',pair.publicKey)).rejects.toThrow();
});
it('rejects a valid payload signed by another key',async()=>{
  const other=await generateKeyPair('RS256');
  await expect(verifyFirebaseToken(await token(),'fixture-project',other.publicKey)).rejects.toThrow();
});
it('rejects missing authorization before considering configuration',async()=>{
  await expect(requireIdentity(new Request('https://fixture.test'))).rejects.toMatchObject({status:401});
});

describe('Firebase project configuration', () => {
  const request = bearer => new Request('https://fixture.test', { headers: { authorization: `Bearer ${bearer}` } });

  it.each([
    ['private only', 'fixture-project', undefined],
    ['public fallback', undefined, 'fixture-project'],
    ['matching projects', 'fixture-project', 'fixture-project'],
    ['blank private fallback', '   ', 'fixture-project'],
  ])('verifies signed tokens with %s', async (_name, privateId, publicId) => {
    env.FIREBASE_PROJECT_ID = privateId;
    publicEnv.PUBLIC_FIREBASE_PROJECT_ID = publicId;
    expect(await requireIdentity(request(await token()))).toEqual({ uid: 'user-a', email: undefined });
    expect(remoteKeys).toHaveBeenCalledOnce();
  });

  it('rejects conflicting projects before parsing a token or resolving signing keys', async () => {
    env.FIREBASE_PROJECT_ID = 'server-project';
    publicEnv.PUBLIC_FIREBASE_PROJECT_ID = 'browser-project';
    await expect(requireIdentity(request('not-a-jwt'))).rejects.toMatchObject({ status: 503 });
    expect(remoteKeys).not.toHaveBeenCalled();
  });

  it('reports unavailable authentication when neither project is configured', async () => {
    await expect(requireIdentity(request('not-a-jwt'))).rejects.toMatchObject({ status: 503 });
    expect(remoteKeys).not.toHaveBeenCalled();
  });

  it('still rejects another audience when using the public project fallback', async () => {
    publicEnv.PUBLIC_FIREBASE_PROJECT_ID = 'fixture-project';
    await expect(requireIdentity(request(await token({ aud: 'foreign-project' })))).rejects.toMatchObject({ status: 401 });
    expect(remoteKeys).toHaveBeenCalledOnce();
  });

  it('still rejects an invalid signature when using the public project fallback', async () => {
    publicEnv.PUBLIC_FIREBASE_PROJECT_ID = 'fixture-project';
    const other = await generateKeyPair('RS256');
    remoteKeys.mockResolvedValueOnce(other.publicKey);
    await expect(requireIdentity(request(await token()))).rejects.toMatchObject({ status: 401 });
  });
});
describe('server entitlements',()=>{
  it.each([null,{plan:'elite',subscription_status:'past_due',current_period_end:'2099-01-01'},
    {plan:'elite',subscription_status:'active',current_period_end:null},
    {plan:'elite',subscription_status:'active',current_period_end:'2000-01-01'}])('does not grant expired/inactive privileges',account=>{
      expect(effectivePlan(account)).toBe('free');
    });
  it('grants only current active plans',()=>expect(effectivePlan({plan:'pro',subscription_status:'active',current_period_end:'2099-01-01'})).toBe('pro'));
});
