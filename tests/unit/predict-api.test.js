import { describe,it,expect,vi,beforeEach } from 'vitest';
vi.mock('$lib/server/identity.js',()=>({requireIdentity:vi.fn(async()=>({uid:'verified-user'}))}));
vi.mock('$lib/server/entitlements.js',()=>({getEntitlements:vi.fn(async()=>({plan:'free'}))}));
vi.mock('$lib/services/ratelimit.js',()=>({checkRateLimit:vi.fn(async()=>({success:true}))}));
import { getEntitlements } from '$lib/server/entitlements.js';
import { checkRateLimit } from '$lib/services/ratelimit.js';
import { POST,GET } from '../../src/routes/api/predict/+server.js';
import { POST as BATCH } from '../../src/routes/api/predict-batch/+server.js';
const event=body=>({request:new Request('http://localhost/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
beforeEach(()=>{vi.clearAllMocks();getEntitlements.mockResolvedValue({plan:'free'});checkRateLimit.mockResolvedValue({success:true});});
describe('versioned prediction routes',()=>{
  it('rejects legacy averages instead of calling heuristic fallback',async()=>{
    const response=await POST(event({homeTeam:{name:'Lakers',stats:{fullHome:115}},awayTeam:{name:'Celtics',stats:{fullAway:112}},line:220}));
    expect(response.status).toBe(422);expect(await response.json()).toMatchObject({status:'abstained',reason:'DATA_CONTRACT_REQUIRED',projection:null});
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('uses verified identity and entitlements even for invalid claimed elite requests',async()=>{
    await POST(event({userId:'victim',plan:'elite'}));
    expect(checkRateLimit).toHaveBeenCalledWith('verified-user','free','predictions');
  });
  it.each([{},null,[],3])('rejects malformed body %j',async body=>expect((await POST(event(body))).status).toBe(400));
  it('abstains on a valid reference without a registered data source',async()=>{
    const response=await POST(event({version:'prediction-chain-1',snapshotId:'one'}));
    expect(response.status).toBe(200);expect((await response.json()).reason).toBe('SNAPSHOT_UNAVAILABLE');
  });
  it('reports actual capabilities, not connection as model availability',async()=>{
    expect(await (await GET()).json()).toMatchObject({status:'limited',capabilities:{commercialPicks:false,nba:{Q1:'unsupported'}}});
  });
  it('preserves quota denial and unavailability',async()=>{
    checkRateLimit.mockResolvedValue({success:false});expect((await POST(event({version:'old'}))).status).toBe(429);
    checkRateLimit.mockResolvedValue({unavailable:true});expect((await POST(event({version:'old'}))).status).toBe(503);
  });
  it('rejects old batch format and oversized batches',async()=>{
    expect((await BATCH(event({games:[{}]}))).status).toBe(400);
    expect((await BATCH(event({requests:Array(16).fill({})}))).status).toBe(400);
  });
  it('protects batch entitlement and uses the same contract',async()=>{
    const body={requests:[{version:'prediction-chain-1',snapshotId:'one'}]};
    expect((await BATCH(event(body))).status).toBe(403);
    getEntitlements.mockResolvedValue({plan:'elite'});
    const result=await (await BATCH(event(body))).json();
    expect(result.analyses[0].reason).toBe('SNAPSHOT_UNAVAILABLE');
  });
});
