import { json, isHttpError } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { latestTennis, recordTennisAnalysis } from '$lib/server/tennis-feed.js';
import { demoDataset } from '$lib/tennis/demo.js';
import { calendarDays, dateKey, analyzeMatch } from '$lib/tennis/domain.js';
const reply=(data,status=200)=>json(data,{status,headers:{'Cache-Control':'no-store'}});

export async function GET({url,request}) {
  const now=Date.now(),demo=url.searchParams.get('demo')==='1';
  const timezone=url.searchParams.get('tz')||'America/Guayaquil';
  let days;
  try{days=calendarDays(now,timezone);}catch{return reply({error:'Zona horaria inválida.'},400);}
  const day=url.searchParams.get('date')||days[0];
  if(!days.includes(day))return reply({error:'El calendario admite hoy y mañana en la zona seleccionada.'},400);
  if(!demo)await requireIdentity(request);
  try {
    const demoAt=url.searchParams.has('demoAt')?Date.parse(url.searchParams.get('demoAt')):now;
    if(demo&&(!Number.isFinite(demoAt)||demoAt>now||now-demoAt>6*3600000))return reply({error:'La demostración caducó. Actualiza el calendario.'},400);
    const snapshot=demo?{id:null,payload:demoDataset(demoAt,timezone)}:await latestTennis();
    if(!snapshot)return reply({status:'unconfigured',error:'El proveedor de tenis todavía no está conectado. Puedes explorar el ejemplo visual.'},503);
    const data=snapshot.payload;
    const metadata={isDemo:demo,provider:data.provider,fetchedAt:data.fetchedAt,coverage:data.coverage,timezone,days,stale:now-Date.parse(data.fetchedAt)>6*3600000,snapshotId:snapshot.id};
    const matchId=url.searchParams.get('match');
    if(matchId){
      const match=data.matches.find(m=>m.id===matchId);
      if(!match)return reply({error:'Partido no encontrado.'},404);
      const analysis=analyzeMatch(data,match,now);
      const playerIds=new Set([match.a,match.b,...analysis.summaries.flatMap(s=>s.recent.map(r=>r.opponent))]);
      return reply({...metadata,match,players:data.players.filter(p=>playerIds.has(p.id)),analysis});
    }
    const matches=data.matches.filter(m=>dateKey(m.startAt,timezone)===day).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)||a.id.localeCompare(b.id));
    const ids=new Set(matches.flatMap(m=>[m.a,m.b]));
    return reply({...metadata,matches,players:data.players.filter(p=>ids.has(p.id))});
  }catch(e){if(isHttpError(e))throw e;return reply({error:'No pudimos cargar los datos de tenis. Reintenta más tarde.'},503);}
}

// Persist an auditable calculation only through an authenticated explicit action.
export async function POST({request}) {
  await requireIdentity(request);
  let body;try{body=await request.json();}catch{return reply({error:'Solicitud inválida.'},400);}
  if(typeof body?.matchId!=='string'||body.matchId.length>100)return reply({error:'Partido requerido.'},400);
  try{
    const snapshot=await latestTennis();
    const match=snapshot?.payload.matches.find(m=>m.id===body.matchId);
    if(!match)return reply({error:'Partido no disponible.'},404);
    return reply({snapshotId:snapshot.id,analysis:await recordTennisAnalysis(snapshot,match)});
  }catch(e){if(isHttpError(e))throw e;return reply({error:'No se pudo guardar el análisis.'},503);}
}
