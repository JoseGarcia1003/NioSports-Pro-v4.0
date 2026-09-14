export const SPORTS = [
  { id:'nba', name:'NBA', symbol:'🏀', status:'available', href:'/sports/nba', description:'Calendario, totales y contexto de los equipos.', color:'#e9ab73' },
  { id:'tennis', name:'Tenis', symbol:'🎾', status:'available', href:'/tennis', demoHref:'/tennis?demo=1', description:'ATP, WTA y circuitos de desarrollo. Jugadores y superficies.', color:'#b4da84' },
  { id:'football', name:'Fútbol', symbol:'⚽', status:'planned', description:'En preparación. Todavía no hay datos ni análisis disponibles.', color:'#84c9b6' },
  { id:'baseball', name:'Béisbol', symbol:'⚾', status:'planned', description:'En preparación. Todavía no hay datos ni análisis disponibles.', color:'#94aeee' }
];
export const PRIMARY_NAV = [
  { href:'/today', label:'Hoy', icon:'Home', paths:['/today'] },
  { href:'/predictions', label:'Pronósticos', icon:'Cpu', paths:['/predictions','/picks'] },
  { href:'/sports', label:'Deportes', icon:'Trophy', paths:['/sports','/tennis','/totales'] },
  { href:'/bankroll', label:'Bankroll', icon:'Wallet', paths:['/bankroll','/tracking','/stats','/results'] },
  { href:'/account', label:'Cuenta', icon:'User', paths:['/account','/pricing'] }
];
export function navActive(item, path) { return item.paths.some(root=>path===root||path.startsWith(`${root}/`)); }
export function planLabel(sub) {
  if (sub.status==='loading') return 'Consultando plan…';
  if (sub.status==='unavailable') return 'Plan por verificar';
  return ['pro','elite'].includes(sub.plan)&&['active','trialing'].includes(sub.status)?`Premium · ${sub.plan==='elite'?'Elite':'Pro'}`:'FREE';
}
