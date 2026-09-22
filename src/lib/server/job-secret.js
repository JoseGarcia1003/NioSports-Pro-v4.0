import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'node:crypto';
import { error } from '@sveltejs/kit';
export function requireJobSecret(request) {
 const expected=env.CRON_SECRET;
 const actual=request.headers.get('authorization')||'';
 if(!expected||actual.length>4096)error(401,'Unauthorized');
 const a=Buffer.from(actual),b=Buffer.from(`Bearer ${expected}`);
 if(a.length!==b.length||!timingSafeEqual(a,b))error(401,'Unauthorized');
}
