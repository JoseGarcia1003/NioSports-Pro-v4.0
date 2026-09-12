// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair, SignJWT } from 'jose';
import { verifyFirebaseToken, requireIdentity } from '../../src/lib/server/identity.js';
import { effectivePlan } from '../../src/lib/server/entitlements.js';
let pair;
beforeAll(async()=>{pair=await generateKeyPair('RS256');});
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
describe('server entitlements',()=>{
  it.each([null,{plan:'elite',subscription_status:'past_due',current_period_end:'2099-01-01'},
    {plan:'elite',subscription_status:'active',current_period_end:null},
    {plan:'elite',subscription_status:'active',current_period_end:'2000-01-01'}])('does not grant expired/inactive privileges',account=>{
      expect(effectivePlan(account)).toBe('free');
    });
  it('grants only current active plans',()=>expect(effectivePlan({plan:'pro',subscription_status:'active',current_period_end:'2099-01-01'})).toBe('pro'));
});
