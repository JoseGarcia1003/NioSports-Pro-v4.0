import { beforeEach,it,expect,vi } from 'vitest';
import { error } from '@sveltejs/kit';
vi.mock('$lib/server/identity.js',()=>({requireIdentity:vi.fn()}));
vi.mock('$lib/server/tennis-feed.js',()=>({latestTennis:vi.fn(),recordTennisAnalysis:vi.fn()}));
import { requireIdentity } from '$lib/server/identity.js';
import { latestTennis } from '$lib/server/tennis-feed.js';
import { GET } from '../../src/routes/api/tennis/+server.js';
const event=query=>{const url=new URL(`http://localhost/api/tennis?${query}`);return {url,request:new Request(url)};};
beforeEach(()=>{vi.clearAllMocks();requireIdentity.mockImplementation(()=>{throw error(401,'Unauthorized');});});
it('provides explicitly marked public demo without database access',async()=>{const response=await GET(event('demo=1'));const body=await response.json();expect(response.status).toBe(200);expect(body.isDemo).toBe(true);expect(body.snapshotId).toBeNull();expect(latestTennis).not.toHaveBeenCalled();});
it('protects real data',async()=>{await expect(GET(event(''))).rejects.toMatchObject({status:401});expect(latestTennis).not.toHaveBeenCalled();});
it('rejects invalid timezone and date',async()=>{expect((await GET(event('demo=1&tz=invalid'))).status).toBe(400);expect((await GET(event('demo=1&date=2000-01-01'))).status).toBe(400);});
it('returns unavailable without synthetic fallback',async()=>{requireIdentity.mockResolvedValue({uid:'user'});latestTennis.mockResolvedValue(null);const response=await GET(event(''));expect(response.status).toBe(503);expect((await response.json()).status).toBe('unconfigured');});
it('returns a real absence for unknown match IDs',async()=>expect((await GET(event('demo=1&match=unknown'))).status).toBe(404));
it('provides explainable detail with no cache persistence',async()=>{const response=await GET(event('demo=1&match=demo-m0'));const body=await response.json();expect(body.analysis.modelVersion).toBe('tennis-elo-baseline-0.1');expect(body.players.length).toBeGreaterThan(1);expect(response.headers.get('Cache-Control')).toBe('no-store');});
it('keeps demo match time consistent between calendar and detail',async()=>{
  const calendar=await (await GET(event('demo=1'))).json();
  const match=calendar.matches[0];
  const detail=await (await GET(event(`demo=1&match=${match.id}&demoAt=${encodeURIComponent(calendar.fetchedAt)}`))).json();
  expect(detail.match.startAt).toBe(match.startAt);expect(detail.fetchedAt).toBe(calendar.fetchedAt);
});
it('rejects invalid or future demo anchors',async()=>{
  expect((await GET(event('demo=1&demoAt=invalid'))).status).toBe(400);
  expect((await GET(event(`demo=1&demoAt=${encodeURIComponent(new Date(Date.now()+3600000).toISOString())}`))).status).toBe(400);
});
