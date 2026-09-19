import { adminDatabase } from './entitlements.js';
import { latestTennis } from './tennis-feed.js';
import { analyzeMatch,dateKey } from '$lib/tennis/domain.js';
import { CATALOG_ZONE,validateEdition } from '$lib/catalog/domain.js';
export async function readEdition(day) {
 const db=adminDatabase();
 const {data,error}=await db.from('prediction_editions').select('payload,published_at').eq('day',day).maybeSingle();
 if(error)throw new Error('Catalog storage unavailable');
 if(!data)return null;
 const {data:withdrawals,error:failure}=await db.from('prediction_withdrawals').select('entry_id,reason').eq('day',day);
 if(failure)throw new Error('Catalog safety status unavailable');
 return {...data,withdrawals:withdrawals||[]};
}
export async function publishEdition(edition,now=Date.now()) {
 validateEdition(edition,{now,publishing:true});
 const {error}=await adminDatabase().from('prediction_editions').insert({day:edition.day,payload:edition});
 if(error&&error.code!=='23505')throw new Error('Catalog publication failed');
 // Concurrent publishers all return the edition actually stored; never replace the reward.
 return readEdition(edition.day);
}
export async function withdrawEntry(day,entryId,reason) {
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||typeof entryId!=='string'||typeof reason!=='string'||!reason.trim()||reason.length>500)throw new Error('Invalid withdrawal');
 const stored=await readEdition(day);
 if(!stored?.payload.entries.some(e=>e.id===entryId))throw new Error('Entry not found');
 const {error}=await adminDatabase().from('prediction_withdrawals').insert({day,entry_id:entryId,reason:reason.trim()});
 if(error&&error.code!=='23505')throw new Error('Withdrawal failed');
 // Append-only: an analysis can be withdrawn, never silently restored or replaced.
 return readEdition(day);
}
export async function publishTennisEdition(now=Date.now()) {
 const day=dateKey(now,CATALOG_ZONE);
 const existing=await readEdition(day);if(existing)return existing;
 const snapshot=await latestTennis();if(!snapshot)return null;
 const players=new Map(snapshot.payload.players.map(p=>[p.id,p.name]));
 const candidates=snapshot.payload.matches.filter(m=>dateKey(m.startAt,CATALOG_ZONE)===day&&m.status==='scheduled'&&Date.parse(m.startAt)>now)
  .sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)||a.id.localeCompare(b.id)).slice(0,200);
 const entries=candidates.flatMap(match=>{
  const analysis=analyzeMatch(snapshot.payload,match,now);
  if(analysis.status!=='experimental')return [];
  const a=analysis.probabilityA>=.5;return [{id:`tennis:${match.id}`,sport:'tennis',event:`${players.get(match.a)} · ${players.get(match.b)}`,startsAt:match.startAt,tier:'premium',modelVersion:analysis.modelVersion,
   source:{name:snapshot.payload.provider,snapshotId:snapshot.id,asOf:snapshot.payload.fetchedAt},
   analysis:{selection:`Ganador estimado: ${players.get(a?match.a:match.b)}`,probability:a?analysis.probabilityA:1-analysis.probabilityA,calibrated:false,
    explanation:'Modelo experimental: combina Elo general y Elo de la superficie a partes iguales. No incorpora cuotas y no demuestra rentabilidad.',
    factors:[`Superficie: ${match.surface}`,`Historial completo: ${analysis.ratings[0].matches} y ${analysis.ratings[1].matches} partidos.`,`Muestra en superficie: ${analysis.ratings[0].surfaceMatches} y ${analysis.ratings[1].surfaceMatches} partidos.`]}}];
 }).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)||a.id.localeCompare(b.id));
 if(!entries.length)return null;
 return publishEdition({version:1,isDemo:false,timezone:CATALOG_ZONE,day,entries,freePickId:entries[0].id},now);
}
