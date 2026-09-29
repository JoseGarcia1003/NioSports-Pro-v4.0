import { DATA_DICTIONARY, tennisPredictors } from '../data/contract.js';

export const ELO_SPEC=Object.freeze({id:'tennis-elo-baseline-0.1',k:24,initial:1500,scale:400,surfaceWeight:0.5,
  calibrated:false,target:'winner_conditional_on_completed_match'});
export const eloProbability=(a,b)=>1/(1+10**((b-a)/ELO_SPEC.scale));

// Rating updates see historical completed outcomes only; no odds or UI concerns.
export function eloRatings(history) {
  const ratings=new Map();
  const get=id=>{
    if(!ratings.has(id))ratings.set(id,{overall:1500,hard:1500,clay:1500,grass:1500,count:0,surfaceCount:{hard:0,clay:0,grass:0},last:null});
    return ratings.get(id);
  };
  for(const h of history){
    const a=get(h.a),b=get(h.b),win=h.winner===h.a?1:0;
    for(const key of ['overall',h.surface]){const delta=ELO_SPEC.k*(win-eloProbability(a[key],b[key]));a[key]+=delta;b[key]-=delta;}
    for(const p of [a,b]){p.count++;p.surfaceCount[h.surface]++;p.last=h.endedAt;}
  }
  return get;
}

export function tennisEligibility(data,match,a,b,latest,now) {
  const reasons=[];
  if(match.status!=='scheduled'||Date.parse(match.startAt)<=now)reasons.push('El partido ya empezó o no está programado.');
  if(now-Date.parse(data.fetchedAt)>6*3600000)reasons.push('La actualización tiene más de seis horas.');
  if(Math.min(a.count,b.count)<20)reasons.push('Se necesitan al menos 20 partidos completos por jugador.');
  if(Math.min(a.surfaceCount[match.surface],b.surfaceCount[match.surface])<8)reasons.push('Se necesitan al menos 8 partidos por jugador en esta superficie.');
  if([a,b].some(p=>!p.last || now-Date.parse(p.last)>180*86400000))reasons.push('Historial reciente insuficiente: más de 180 días sin partido registrado.');
  if(latest.some(r=>r?.status==='reported'))reasons.push('Existe una incidencia física reportada; requiere revisión.');
  if(data.isDemo!==true)reasons.push('El feed antiguo todavía no acredita el contrato temporal de los ratings. Análisis predictivo no habilitado.');
  return reasons;
}

// Fixture adapter only. A real feed must preserve original capture/source revisions,
// which cannot be manufactured from fetchedAt. No observed v1 feed is upgraded here.
export function demoRatingProbability(data,match,a,b,cutoff,now) {
  if(data.isDemo!==true)throw new Error('FIXTURE_REQUIRED');
  const at=new Date(cutoff).toISOString();
  const definitions=new Map(DATA_DICTIONARY.variables.map(v=>[v.name,v]));
  const observation=(variable,value,entityId)=>({id:variable+':'+entityId,variable,value,entityId,
    unit:definitions.get(variable).unit,measuredAt:at,availableAt:at,capturedAt:at,missingReason:null,
    source:{kind:'fixture',provider:'tennis-demo',recordId:match.id+':'+variable+':'+entityId,revision:ELO_SPEC.id,publishedAt:at}});
  const observations=[observation('tennis.surface',match.surface,match.id),observation('tennis.best_of',match.bestOf,match.id)];
  for(const [id,p]of [[match.a,a],[match.b,b]])for(const [variable,value]of [
    ['tennis.elo_overall',p.overall],['tennis.elo_surface',p[match.surface]],
    ['tennis.history_count',p.count],['tennis.surface_count',p.surfaceCount[match.surface]]])observations.push(observation(variable,value,id));
  const snapshot={schemaVersion:'1.0.0',purpose:'inference',origin:'fixture',asOf:at,previousHash:null,
    event:{id:match.id,sport:'tennis',league:match.circuit,period:'MATCH',season:String(new Date(match.startAt).getUTCFullYear()),
      startsAt:new Date(match.startAt).toISOString(),timezone:'UTC',participants:[match.a,match.b]},observations};
  const inputs=tennisPredictors(snapshot,{now,allowFixtures:true});
  const blended=id=>(inputs[id]['tennis.elo_overall']+inputs[id]['tennis.elo_surface'])/2;
  return eloProbability(blended(match.a),blended(match.b));
}
