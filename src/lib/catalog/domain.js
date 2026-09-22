import { dateKey } from '$lib/tennis/domain.js';
export const CATALOG_ZONE='America/Guayaquil';
const validId=value=>typeof value==='string'&&/^[\w:.-]{1,160}$/.test(value);
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const time=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
export function validateEdition(edition,{now=Date.now(),publishing=false,allowDemo=false}={}) {
 if(!edition||edition.version!==1||(edition.isDemo!==false&&!(allowDemo&&!publishing&&edition.isDemo===true))||edition.timezone!==CATALOG_ZONE||!/^\d{4}-\d{2}-\d{2}$/.test(edition.day)||!Array.isArray(edition.entries)||edition.entries.length<1||edition.entries.length>200)throw new Error('Invalid catalog edition');
 if(publishing&&edition.day!==dateKey(now,CATALOG_ZONE))throw new Error('Only today can be published');
 const ids=new Set();
 for(const entry of edition.entries){
  if(!validId(entry.id)||ids.has(entry.id)||!['nba','tennis','football','baseball'].includes(entry.sport)||!text(entry.event,200)||!time(entry.startsAt)||dateKey(entry.startsAt,CATALOG_ZONE)!==edition.day||!['free','premium'].includes(entry.tier))throw new Error('Invalid catalog entry');
  ids.add(entry.id);
  if(publishing&&Date.parse(entry.startsAt)<=now)throw new Error('Cannot publish started matches');
  if(!text(entry.modelVersion,100)||!entry.source||!text(entry.source.name,150)||!validId(entry.source.snapshotId)||!time(entry.source.asOf)||Date.parse(entry.source.asOf)>Math.min(now,Date.parse(entry.startsAt)))throw new Error('Invalid source provenance');
  if(publishing&&now-Date.parse(entry.source.asOf)>6*3600000)throw new Error('Stale catalog source');
  const analysis=entry.analysis;
  if(!analysis||!text(analysis.selection,200)||!text(analysis.explanation,3000)||!Array.isArray(analysis.factors)||analysis.factors.length>10||analysis.factors.some(f=>!text(f,500))||typeof analysis.probability!=='number'||!Number.isFinite(analysis.probability)||analysis.probability<=0||analysis.probability>=1||analysis.calibrated!==false)throw new Error('Invalid experimental analysis');
 }
 if(!edition.entries.some(e=>e.id===edition.freePickId&&e.tier==='premium'))throw new Error('Missing fixed daily reward');
 return edition;
}
// Explicit allowlists prevent future private fields from leaking into previews.
export function catalogView(edition,{authenticated=false,plan='free',withdrawals=[],now=Date.now(),allowDemo=false}={}) {
 validateEdition(edition,{now,allowDemo});
 const premium=authenticated&&['pro','elite'].includes(plan);
 const daily=edition.day===dateKey(now,CATALOG_ZONE);
 return {day:edition.day,timezone:CATALOG_ZONE,published:true,isDemo:edition.isDemo,freePickId:edition.freePickId,
  entries:edition.entries.map(e=>{
   const withdrawn=withdrawals.find(w=>w.entry_id===e.id);
   const access=e.tier==='free'||premium||(authenticated&&daily&&e.id===edition.freePickId);
   const result={id:e.id,sport:e.sport,event:e.event,startsAt:e.startsAt,tier:e.tier,isDailyReward:e.id===edition.freePickId,
    status:withdrawn?'withdrawn':Date.parse(e.startsAt)<=now?'started':'scheduled',locked:!access,withdrawnReason:withdrawn?.reason??null,
    source:{name:e.source.name,asOf:e.source.asOf},modelVersion:e.modelVersion};
   if(access&&!withdrawn)result.analysis={selection:e.analysis.selection,explanation:e.analysis.explanation,probability:e.analysis.probability,factors:[...e.analysis.factors],calibrated:false};
   return result;
  })};
}
