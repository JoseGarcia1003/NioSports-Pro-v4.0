import { json } from '@sveltejs/kit';
import { requireJobSecret } from '$lib/server/job-secret.js';
import { withdrawEntry } from '$lib/server/catalog.js';
import { readLimitedJSON } from '$lib/server/tennis-feed.js';
export async function POST({request}) {
 requireJobSecret(request);
 const headers={'Cache-Control':'no-store'};
 let body;
 try{body=await readLimitedJSON(new Response(request.body,{headers:request.headers}),4096);}
 catch{return json({error:'Solicitud inválida.'},{status:400,headers});}
 if(!body||typeof body.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.day)||typeof body.entryId!=='string'||body.entryId.length>160||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>500)return json({error:'Indica la edición, el análisis y el motivo.'},{status:400,headers});
 try{const stored=await withdrawEntry(body.day,body.entryId,body.reason);return json({withdrawn:stored.withdrawals.some(w=>w.entry_id===body.entryId)},{headers});}
 catch{return json({error:'No se pudo retirar el análisis.'},{status:503,headers});}
}
