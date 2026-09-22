// @vitest-environment node
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const {env,insert,admin}=vi.hoisted(()=>({env:{TENNIS_FEED_URL:'https://provider.example/feed',TENNIS_API_KEY:'test-key',TENNIS_PROVIDER_ID:'test',CRON_SECRET:'test-cron'},insert:vi.fn(),admin:vi.fn()}));
vi.mock('$env/dynamic/private',()=>({env}));
vi.mock('$lib/server/entitlements.js',()=>({adminDatabase:admin}));
import { ingestTennis,readLimitedJSON } from '../../src/lib/server/tennis-feed.js';
import { POST } from '../../src/routes/api/tennis/sync/+server.js';
import { demoDataset } from '../../src/lib/tennis/demo.js';
const now=Date.parse('2026-09-12T14:00:00Z');
function fixture(){const data=demoDataset(now);data.isDemo=false;data.provider='test';return data;}
beforeEach(()=>{vi.clearAllMocks();insert.mockResolvedValue({error:null});admin.mockReturnValue({from:()=>({insert})});vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture()))));});
afterEach(()=>vi.unstubAllGlobals());
it('stores one validated immutable delivery and keeps key in server headers',async()=>{
  const result=await ingestTennis(now);expect(result.snapshotId).toMatch(/^[a-f0-9]{64}$/);expect(insert).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledWith(expect.any(URL),expect.objectContaining({redirect:'error',headers:expect.objectContaining({Authorization:'Bearer test-key'})}));
});
it('never imports demo payloads into storage',async()=>{fetch.mockResolvedValue(new Response(JSON.stringify(demoDataset(now))));await expect(ingestTennis(now)).rejects.toThrow('Demo');expect(insert).not.toHaveBeenCalled();});
it('rejects provider failures without replacing the existing snapshot',async()=>{fetch.mockResolvedValue(new Response('Unavailable',{status:503}));await expect(ingestTennis(now)).rejects.toThrow();expect(insert).not.toHaveBeenCalled();});
it('rejects stale feeds',async()=>{await expect(ingestTennis(now+7*3600000)).rejects.toThrow('Stale');expect(insert).not.toHaveBeenCalled();});
it('rejects partial/truncated JSON',async()=>{fetch.mockResolvedValue(new Response('{'));await expect(ingestTennis(now)).rejects.toThrow();expect(insert).not.toHaveBeenCalled();});
it('bounds streamed feed size even without content-length',async()=>{await expect(readLimitedJSON(new Response('0123456789'),5)).rejects.toThrow('too large');});
it('propagates storage failure as failure',async()=>{insert.mockResolvedValue({error:{code:'42501'}});await expect(ingestTennis(now)).rejects.toThrow('storage');});
it('protects synchronization before any request to paid provider',async()=>{const response=await POST({request:new Request('http://localhost/api/tennis/sync',{method:'POST'})});expect(response.status).toBe(401);expect(fetch).not.toHaveBeenCalled();});
