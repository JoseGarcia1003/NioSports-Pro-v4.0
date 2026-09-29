import { json, isHttpError } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { getEntitlements } from '$lib/server/entitlements.js';
import { checkRateLimit } from '$lib/services/ratelimit.js';
import { requestPrediction, capabilities } from '$lib/server/prediction-service.js';
const reply=(body,status=200)=>json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function POST({request}) {
  const identity=await requireIdentity(request);
  let body;
  try { body=await request.json(); } catch { return reply({error:'Solicitud inválida.'},400); }
  if (!body || typeof body!=='object' || Array.isArray(body) || !Object.keys(body).length) return reply({error:'Solicitud inválida.',status:'abstained'},400);
  try {
    const {plan}=await getEntitlements(identity.uid);
    const quota=await checkRateLimit(identity.uid,plan,'predictions');
    if(quota.unavailable)return reply({error:'Quota service unavailable'},503);
    if(!quota.success)return reply({error:'rate_limited'},429);
    const result=await requestPrediction(body);
    return reply(result,result.reason==='DATA_CONTRACT_REQUIRED'?422:200);
  } catch(error) {
    if(isHttpError(error))throw error;
    return reply({error:'No se pudo completar el análisis.',status:'unavailable'},503);
  }
}
export async function GET() { return reply({status:'limited',capabilities}); }
