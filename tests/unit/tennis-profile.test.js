import { it, expect } from 'vitest';
import { playerProfile } from '../../src/lib/tennis/domain.js';
import { demoDataset } from '../../src/lib/tennis/demo.js';
const now=Date.parse('2026-09-13T15:00:00Z');
it('returns season totals from completed matches and identifies exceptions separately',()=>{
 const data=demoDataset(now);const id=data.players[0].id;
 const row=data.history.find(h=>h.a===id||h.b===id);row.status='retired';
 const result=playerProfile(data,id,now);
 const completed=data.history.filter(h=>(h.a===id||h.b===id)&&h.status==='completed');
 expect(result.summary.season.played).toBe(completed.length);
 expect(result.recent.length).toBeLessThanOrEqual(30);
 expect(result.recent.every(h=>result.players.some(p=>p.id===h.a)&&result.players.some(p=>p.id===h.b))).toBe(true);
});
it('excludes results, health reports and service rollups not yet known at the cutoff',()=>{
 const data=demoDataset(now);const id=data.players[0].id;
 const cutoff=now-7*86400000;
 data.injuries.push({playerId:id,status:'reported',publishedAt:new Date(now).toISOString()});
 const result=playerProfile(data,id,cutoff);
 expect(result.recent.every(h=>Date.parse(h.endedAt)<cutoff&&Date.parse(h.observedAt)<=cutoff)).toBe(true);
 expect(result.injury).toBeNull();expect(result.serviceStats).toEqual([]);
});
it('does not count future, cancelled or started matches as upcoming',()=>{
 const data=demoDataset(now);const id=data.matches[0].a;data.matches[0].status='cancelled';
 const result=playerProfile(data,id,now);
 expect(result.upcoming.every(m=>m.status==='scheduled'&&Date.parse(m.startAt)>now)).toBe(true);
 expect(result.upcoming.some(m=>m.id===data.matches[0].id)).toBe(false);
});
it('returns null for an unknown player and does not mutate the snapshot',()=>{
 const data=demoDataset(now);const before=JSON.stringify(data);
 expect(playerProfile(data,'missing',now)).toBeNull();playerProfile(data,data.players[0].id,now);
 expect(JSON.stringify(data)).toBe(before);
});
it('keeps an empty record honest rather than fabricating statistics',()=>{
 const data=demoDataset(now);data.history=[];data.playerStats=[];
 const result=playerProfile(data,data.players[0].id,now);
 expect(result.summary.season).toEqual({played:0,won:0});expect(result.summary.bestSurface).toBeNull();expect(result.recent).toEqual([]);
});
