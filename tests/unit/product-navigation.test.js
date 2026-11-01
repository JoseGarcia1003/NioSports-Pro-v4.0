import { describe,it,expect } from 'vitest';
import { SPORTS,PRIMARY_NAV,navActive,planLabel } from '../../src/lib/product/navigation.js';
import { getMaxPicks,hasFeature } from '../../src/lib/config/plans.js';
describe('product architecture',()=>{
 it('places every available sport in one extensible directory without fake future links',()=>{expect(SPORTS.filter(s=>s.status==='available').map(s=>s.id)).toEqual(['nba','tennis']);expect(SPORTS.filter(s=>s.status==='planned').every(s=>!s.href)).toBe(true);});
 it('uses six shared navigation destinations, exact path boundaries and the most specific match',()=>{expect(PRIMARY_NAV).toHaveLength(6);const sports=PRIMARY_NAV.find(i=>i.label==='Deportes'),props=PRIMARY_NAV.find(i=>i.label==='Props'),bank=PRIMARY_NAV.find(i=>i.label==='Bankroll');expect(navActive(sports,'/tennis/player/one')).toBe(true);expect(navActive(sports,'/tennis-fake')).toBe(false);expect(navActive(bank,'/stats')).toBe(true);expect(navActive(props,'/sports/nba/props')).toBe(true);expect(navActive(sports,'/sports/nba/props')).toBe(false);expect(navActive(sports,'/sports/nba')).toBe(true);});
 it('does not invent an available pick when there are none',()=>{for(const n of [0,-1,NaN,Infinity,1.5])expect(getMaxPicks('free',n)).toBe(0);});
 it('shows exactly one FREE selection and all available paid selections',()=>{expect(getMaxPicks('free',40)).toBe(1);expect(getMaxPicks('unknown',40)).toBe(1);expect(getMaxPicks('pro',40)).toBe(40);expect(getMaxPicks('elite',40)).toBe(40);});
 it('opens personal statistics and bankroll while retaining advanced export gating',()=>{expect(hasFeature('free','bankroll')).toBe(true);expect(hasFeature('free','fullStats')).toBe(true);expect(hasFeature('free','csvExport')).toBe(false);});
 it('distinguishes unavailable billing from a verified subscription',()=>{expect(planLabel({plan:'elite',status:'unavailable'})).toBe('Plan por verificar');expect(planLabel({plan:'elite',status:'canceled'})).toBe('FREE');expect(planLabel({plan:'pro',status:'trialing'})).toBe('Premium · Pro');});
});
