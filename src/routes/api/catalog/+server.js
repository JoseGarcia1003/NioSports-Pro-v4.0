import { json,isHttpError } from '@sveltejs/kit';
import { requireIdentity } from '$lib/server/identity.js';
import { getEntitlements } from '$lib/server/entitlements.js';
import { demoEdition } from '$lib/catalog/demo.js';
import { readEdition } from '$lib/server/catalog.js';
import { dateKey } from '$lib/tennis/domain.js';
import { CATALOG_ZONE,catalogView } from '$lib/catalog/domain.js';
export async function GET({request,url}) {
 const now=Date.now(),day=dateKey(now,CATALOG_ZONE);
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization'};
 if(url?.searchParams.get('demo')==='1')return json(catalogView(demoEdition(now),{authenticated:true,plan:'free',now,allowDemo:true}),{headers});
 let identity=null;
 // Invalid credentials never silently downgrade to a public response.
 if(request.headers.has('authorization'))identity=await requireIdentity(request);
 try{
  const stored=await readEdition(day);
  if(!stored)return json({day,timezone:CATALOG_ZONE,published:false,entries:[],freePickId:null},{headers});
  const account=identity?await getEntitlements(identity.uid):{plan:'free'};
  return json({...catalogView(stored.payload,{authenticated:!!identity,plan:account.plan,withdrawals:stored.withdrawals,now}),publishedAt:stored.published_at},{headers});
 }catch(e){if(isHttpError(e))throw e;return json({error:'No pudimos consultar el catálogo. Reintenta más tarde.'},{status:503,headers});}
}
