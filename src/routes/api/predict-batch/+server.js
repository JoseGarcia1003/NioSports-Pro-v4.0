import { json, isHttpError } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { getEntitlements } from '$lib/server/entitlements.js';
import { checkRateLimit } from '$lib/services/ratelimit.js';
import { requestPrediction } from '$lib/server/prediction-service.js';
const reply=(body,status=200)=>json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function POST({request}) {
  const identity=await requireIdentity(request);
  let body;try{body=await request.json();}catch{return reply({error:'Solicitud inválida.'},400);}
  const items=body?.requests;
  if(!Array.isArray(items)||!items.length||items.length>15)return reply({error:'Se requieren de 1 a 15 solicitudes versionadas.',status:'abstained'},400);
  try {
    const {plan}=await getEntitlements(identity.uid);
    if(plan!=='elite')return reply({error:'Elite subscription required'},403);
    const quota=await checkRateLimit(identity.uid,plan,'predictions');
    if(quota.unavailable)return reply({error:'Quota service unavailable'},503);
    if(!quota.success)return reply({error:'rate_limited'},429);
    const analyses=[];
    for(const item of items)analyses.push(await requestPrediction(item));
    return reply({version:'prediction-chain-1',analyses,count:analyses.length});
  } catch(error) {
    if(isHttpError(error))throw error;
    return reply({error:'No se pudo completar el lote.',status:'unavailable'},503);
  }
}
