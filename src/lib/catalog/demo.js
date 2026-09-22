import { CATALOG_ZONE } from './domain.js';
import { demoDataset } from '$lib/tennis/demo.js';
import { dateKey } from '$lib/tennis/domain.js';
export function demoEdition(now=Date.now()) {
 const data=demoDataset(now,CATALOG_ZONE),day=dateKey(now,CATALOG_ZONE),players=new Map(data.players.map(p=>[p.id,p.name]));
 const entries=data.matches.filter(m=>dateKey(m.startAt,CATALOG_ZONE)===day).slice(0,3).map((m,i)=>({id:`example-${i}`,sport:'tennis',event:`${players.get(m.a)} · ${players.get(m.b)}`,startsAt:m.startAt,tier:i===2?'free':'premium',modelVersion:'ejemplo-visual',source:{name:'Laboratorio ficticio',snapshotId:'example',asOf:data.fetchedAt},analysis:{selection:`Ejemplo: ${players.get(m.a)}`,probability:.56+i*.02,explanation:'Ejemplo ficticio para explorar cómo se presenta un análisis. No describe un partido real.',factors:['Historial y estadísticas simulados.','No utilizar para apostar.'],calibrated:false}}));
 return {version:1,isDemo:true,day,timezone:CATALOG_ZONE,entries,freePickId:entries[0].id};
}
