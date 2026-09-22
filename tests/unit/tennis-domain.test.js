import { describe,it,expect } from 'vitest';
import { demoDataset } from '../../src/lib/tennis/demo.js';
import { validateDataset,analyzeMatch,calendarDays,dateKey } from '../../src/lib/tennis/domain.js';
const now=Date.parse('2026-09-12T14:00:00Z');
const fixture=()=>demoDataset(now);
describe('Tennis calendar and provider contract',()=>{
  it('handles day rollover in the selected timezone',()=>{
    expect(calendarDays(Date.parse('2027-01-01T02:00:00Z'),'America/Guayaquil')).toEqual(['2026-12-31','2027-01-01']);
    expect(calendarDays(Date.parse('2026-03-29T00:00:00Z'),'Europe/Madrid')).toEqual(['2026-03-29','2026-03-30']);
  });
  it('builds a valid demo across today and tomorrow with no external sources',()=>{
    const data=fixture();expect(validateDataset(data,{now,allowDemo:true})).toBe(data);
    expect(new Set(data.matches.map(m=>dateKey(m.startAt,'America/Guayaquil'))).size).toBe(2);
  });
  it('refuses demo ingestion',()=>expect(()=>validateDataset(fixture(),{now})).toThrow('Demo'));
  it('keeps demo matches visible shortly before midnight',()=>{
    const time=Date.parse('2026-09-13T04:59:00Z');
    const data=demoDataset(time,'America/Guayaquil');
    expect(data.matches.filter(m=>dateKey(m.startAt,'America/Guayaquil')==='2026-09-12')).toHaveLength(4);
    expect(data.matches.every(m=>Date.parse(m.startAt)>time)).toBe(true);
  });
  it('rejects impossible serve statistics instead of displaying false percentages',()=>{
    const data=fixture();data.playerStats[0].firstServeWon=99999;
    expect(()=>validateDataset(data,{now,allowDemo:true})).toThrow('Inconsistent');
  });
  it('does not include service rollups published after the forecast cutoff',()=>{
    const data=fixture();data.playerStats[0].asOf=new Date(now+3600000).toISOString();
    expect(analyzeMatch(data,data.matches[0],now).serviceStats[0]).toBeNull();
  });
  it.each(['pair','gender','duplicate','future','winner','surface','observed','doubles'])('rejects invalid %s data',kind=>{
    const data=fixture();data.isDemo=false;
    if(kind==='pair')data.matches[0].b=data.matches[0].a;
    if(kind==='gender')data.matches[0].b='demo-p8';
    if(kind==='duplicate')data.history.push(data.history[0]);
    if(kind==='future')data.fetchedAt=new Date(now+3600000).toISOString();
    if(kind==='winner')data.history[0].winner='unknown';
    if(kind==='surface')data.matches[0].surface='carpet';
    if(kind==='observed')data.history[0].observedAt='2000-01-01T00:00:00Z';
    if(kind==='doubles')data.matches[0].discipline='doubles';
    expect(()=>validateDataset(data,{now})).toThrow();
  });
});
describe('Experimental tennis model',()=>{
  it('produces deterministic bounded estimates from sufficient historical data',()=>{
    const data=fixture(),match=data.matches[0],result=analyzeMatch(data,match,now);
    expect(result.status).toBe('experimental');expect(result.calibrated).toBe(false);
    expect(result.probabilityA).toBeGreaterThan(0);expect(result.probabilityA).toBeLessThan(1);
    expect(analyzeMatch(data,match,now)).toEqual(result);
  });
  it('is symmetric when player order changes',()=>{
    const data=fixture(),match=data.matches[0];
    expect(analyzeMatch(data,{...match,a:match.b,b:match.a},now).probabilityA).toBeCloseTo(1-analyzeMatch(data,match,now).probabilityA);
  });
  it('ignores future, later-observed results and current match',()=>{
    const data=fixture(),match=data.matches[0],result=analyzeMatch(data,match,now);
    data.history.push({...data.history[0],id:'future',endedAt:new Date(now+10000).toISOString()},{...data.history[0],id:'later-observed',observedAt:new Date(now+10000).toISOString()},{...data.history[0],id:match.id});
    expect(analyzeMatch(data,match,now)).toEqual(result);
  });
  it('ignores retirements and walkovers',()=>{
    const data=fixture(),match=data.matches[0],result=analyzeMatch(data,match,now);
    data.history.push({...data.history[0],id:'retirement',status:'retired'},{...data.history[0],id:'walkover',status:'walkover'});
    expect(analyzeMatch(data,match,now)).toEqual(result);
  });
  it('does not imply health when injury reports are missing',()=>expect(analyzeMatch(fixture(),fixture().matches[0],now).injuryReports).toEqual([null,null]));
  it.each(['missing','stale','started','postponed','injury'])('abstains when %s',kind=>{
    const data=fixture(),match=data.matches[0];
    if(kind==='missing')data.history=[];
    if(kind==='stale')data.fetchedAt=new Date(now-7*3600000).toISOString();
    if(kind==='started')match.startAt=new Date(now-1000).toISOString();
    if(kind==='postponed')match.status='postponed';
    if(kind==='injury')data.injuries=[{playerId:match.a,status:'reported',title:'Fictional fixture',publishedAt:new Date(now-1000).toISOString(),sourceUrl:'https://example.org'}];
    const result=analyzeMatch(data,match,now);expect(result.status).toBe('abstained');expect(result.probabilityA).toBeNull();expect(result.reasons.length).toBeGreaterThan(0);
  });
  it('preserves original inputs',()=>{const data=fixture(),before=JSON.stringify(data);analyzeMatch(data,data.matches[0],now);expect(JSON.stringify(data)).toBe(before);});
});
