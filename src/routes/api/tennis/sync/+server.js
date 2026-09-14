import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'node:crypto';
import { ingestTennis } from '$lib/server/tennis-feed.js';
export async function POST({request}) {
  const expected=env.CRON_SECRET?Buffer.from(`Bearer ${env.CRON_SECRET}`):null;
  const actual=Buffer.from(request.headers.get('authorization')||'');
  if(!expected||actual.length!==expected.length||!timingSafeEqual(actual,expected))return json({error:'Unauthorized'},{status:401});
  try{return json(await ingestTennis(),{headers:{'Cache-Control':'no-store'}});}
  catch{return json({error:'La sincronización de tenis falló. Revisa el proveedor, contrato y almacenamiento.'},{status:503});}
}
