export const SPORTS = [
  { id:'nba', name:'NBA', symbol:'🏀', status:'available', href:'/sports/nba', description:'Calendario, totales y contexto de los equipos.', color:'#e9ab73' },
  { id:'tennis', name:'Tenis', symbol:'🎾', status:'available', href:'/tennis', demoHref:'/tennis?demo=1', description:'ATP, WTA y circuitos de desarrollo. Jugadores y superficies.', color:'#b4da84' },
  { id:'football', name:'Fútbol', symbol:'⚽', status:'planned', description:'En preparación. Todavía no hay datos ni análisis disponibles.', color:'#84c9b6' },
  { id:'baseball', name:'Béisbol', symbol:'⚾', status:'planned', description:'En preparación. Todavía no hay datos ni análisis disponibles.', color:'#94aeee' }
];
export const PRIMARY_NAV = [
  { href:'/today', label:'Hoy', icon:'Home', paths:['/today'] },
  { href:'/sports/nba', label:'NBA', icon:'Dribbble', paths:['/sports/nba','/sports','/totales'] },
  { href:'/tennis', label:'Tenis', icon:'Volleyball', paths:['/tennis'] },
  { href:'/predictions', label:'Señales', icon:'Signal', paths:['/predictions','/picks','/public','/methodology'] },
  { href:'/bankroll', label:'Bankroll', icon:'Wallet', paths:['/bankroll','/tracking','/stats','/results'] },
  { href:'/account', label:'Cuenta', icon:'User', paths:['/account','/pricing'] }
];

/** Sections inside NBA, always visible at the top of every NBA page. */
export const NBA_NAV = [
  { href:'/sports/nba', label:'Partidos', exact:true },
  { href:'/sports/nba/props', label:'Props jugadores' },
  { href:'/sports/nba/puntos', label:'Mercado de puntos' },
  { href:'/sports/nba/estadisticas', label:'Estadísticas' },
  { href:'/sports/nba/clasificacion', label:'Clasificación' }
];
export function nbaActive(item, path) {
  return item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
}

const matchLength = (item, path) => Math.max(0, ...item.paths.filter(root => path === root || path.startsWith(`${root}/`)).map(root => root.length));
// The most specific destination wins when two entries share a prefix.
export function navActive(item, path) {
  const own = matchLength(item, path);
  return own > 0 && PRIMARY_NAV.every(other => matchLength(other, path) <= own);
}
export function planLabel(sub) {
  if (sub.status==='loading') return 'Consultando plan…';
  if (sub.status==='unavailable') return 'Plan por verificar';
  return ['pro','elite'].includes(sub.plan)&&['active','trialing'].includes(sub.status)?`Premium · ${sub.plan==='elite'?'Elite':'Pro'}`:'Beta gratuita';
}

/** Destination after signing in: only same-site paths, never back to /login. */
export function safeNext(value) {
  const n = typeof value === 'string' ? value : '';
  return /^\/(?!\/)[^\\]*$/.test(n) && !n.startsWith('/login') ? n : '/today';
}
