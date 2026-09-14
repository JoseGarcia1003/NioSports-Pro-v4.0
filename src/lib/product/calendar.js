import { calendarDays } from '$lib/tennis/domain.js';
export function nbaCalendarUrl(now=Date.now()) {
 const day=calendarDays(now,'America/New_York')[0];
 return `/api/proxy?${new URLSearchParams({endpoint:'/games',params:new URLSearchParams({'dates[]':day}).toString()})}`;
}
export function nbaCalendarRows(response,body) {
 if(!response.ok || response.headers.get('X-Data-Source')!=='balldontlie' || !Array.isArray(body.data))throw new Error('Calendario NBA no confirmado.');
 if(body.data.some(game=>!game||game.id==null||!game.home_team?.full_name||!game.visitor_team?.full_name)||new Set(body.data.map(game=>game.id)).size!==body.data.length)throw new Error('Partidos NBA incompletos.');
 return body.data;
}
