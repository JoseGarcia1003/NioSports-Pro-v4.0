import { DATA_DICTIONARY } from '../../src/lib/data/contract.js';
export const OPTIONS={now:Date.parse('2026-02-01T12:00:00.000Z'),allowFixtures:true};
const stamp='2026-01-31T12:00:00.000Z';
export const observation=(variable,value,entityId='game-1')=>({
  id:variable+':'+entityId,variable,entityId,value,
  unit:DATA_DICTIONARY.variables.find(v=>v.name===variable).unit,
  source:{provider:'controlled-fixture',recordId:variable+':'+entityId,revision:'1',kind:'fixture',publishedAt:stamp},
  measuredAt:stamp,availableAt:stamp,capturedAt:stamp,missingReason:null
});
export function nbaSnapshot() {
  const records=side=>Array.from({length:20},(_,i)=>{
    const at=new Date(Date.UTC(2026,0,i+1,12)).toISOString();
    return {id:side+'-'+i,endedAt:at,availableAt:at,capturedAt:at,value:200+i+(side==='away'?10:0),venue:i%2?'home':'away'};
  });
  const observations=[];
  for(const side of ['home','away']){
    const history=records(side);
    const defs=DATA_DICTIONARY.variables.filter(d=>d.name.startsWith(side+'_') && d.window);
    for(const def of defs){
      const selected=history.slice(-def.window);
      const values=(def.venue?selected.filter(r=>r.venue===def.venue):selected).map(r=>r.value);
      const mean=values.reduce((a,b)=>a+b,0)/values.length;
      const value=def.aggregation==='population_std'?Math.sqrt(values.reduce((n,x)=>n+(x-mean)**2,0)/values.length):mean;
      observations.push({...observation(def.name,value,side),sample:{complete:true,records:selected}});
    }
    observations.push({...observation(side+'_rest_days',side==='home'?0:2,side),rawValue:side==='home'?0:2});
    observations.push(observation('is_b2b_'+side,side==='home'?1:0,side));
  }
  observations.push(observation('rest_diff',-2),observation('altitude_ft',0),{...observation('days_into_season',100),rawValue:100});
  return {schemaVersion:'1.0.0',purpose:'inference',origin:'fixture',asOf:'2026-02-01T10:00:00.000Z',
    event:{id:'game-1',sport:'basketball',league:'NBA',season:'2025-26',period:'FULL',startsAt:'2026-02-02T12:00:00.000Z',timezone:'America/New_York',participants:['home','away']},
    previousHash:null,observations};
}
export function tennisSnapshot(){
  const s=nbaSnapshot();
  s.event={...s.event,sport:'tennis',league:'WTA',period:'MATCH',season:'2026'};
  s.observations=[observation('tennis.surface','hard'),observation('tennis.best_of',3)];
  for(const id of s.event.participants){
    for(const [name,value] of [['elo_overall',1500],['elo_surface',1510],['history_count',30],['surface_count',12]]){
      s.observations.push(observation('tennis.'+name,value,id));
    }
  }
  return s;
}
