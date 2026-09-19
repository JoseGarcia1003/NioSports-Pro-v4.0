import { json } from '@sveltejs/kit';
import { requireJobSecret } from '$lib/server/job-secret.js';
import { publishTennisEdition } from '$lib/server/catalog.js';
export async function POST({request}) {
 requireJobSecret(request);
 try{const stored=await publishTennisEdition();return json({published:!!stored,day:stored?.payload.day??null,count:stored?.payload.entries.length??0},{headers:{'Cache-Control':'no-store'}});}
 catch{return json({error:'No se pudo publicar una edición verificada.'},{status:503});}
}
