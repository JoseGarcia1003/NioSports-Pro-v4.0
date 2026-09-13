export const SURFACES = { hard: 'Dura', clay: 'Tierra batida', grass: 'Césped' };
export const CIRCUITS = ['ATP', 'WTA', 'Challenger', 'WTA 125', 'ITF Men', 'ITF Women'];
export const MODEL_VERSION = 'tennis-elo-baseline-0.1';
export function dateKey(value, timezone = 'America/Guayaquil') {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(new Date(value));
  return ['year','month','day'].map(key => parts.find(p => p.type === key).value).join('-');
}
export function calendarDays(now, timezone) {
  const today = dateKey(now, timezone);
  return [today, new Date(Date.parse(`${today}T12:00:00Z`) + 86400000).toISOString().slice(0,10)];
}
const validTime = value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const id = value => typeof value === 'string' && /^[\w:.-]{1,100}$/.test(value);
const name = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 150;
const fail = message => { throw new Error(message); };
const unique = (rows, label) => {
  if (!Array.isArray(rows)) fail(`${label}: expected array`);
  if (rows.some(row => !row || !id(row.id)) || new Set(rows.map(r=>r.id)).size !== rows.length) fail(`${label}: invalid or duplicate ID`);
};

// Canonical feed boundary. Providers must map their payload here before ingestion.
export function validateDataset(data, { now = Date.now(), allowDemo = false } = {}) {
  if (!data || data.version !== 1 || !name(data.provider) || !validTime(data.fetchedAt) || Date.parse(data.fetchedAt)>now+60000) fail('Invalid feed metadata');
  if (data.isDemo !== false && !(allowDemo && data.isDemo === true)) fail('Demo feed cannot enter real storage');
  if (!Array.isArray(data.coverage) || data.coverage.some(c=>!CIRCUITS.includes(c))) fail('Invalid coverage');
  unique(data.players,'players'); unique(data.matches,'matches'); unique(data.history,'history');
  if (data.players.length>20000 || data.matches.length>5000 || data.history.length>100000) fail('Feed too large');
  const players=new Map(data.players.map(p=>[p.id,p]));
  for(const p of data.players) {
    if(!name(p.name) || !['men','women'].includes(p.gender)) fail('Invalid player');
    if(p.rank!==null && (!Number.isInteger(p.rank)||p.rank<1)) fail('Invalid ranking');
  }
  const pair = m => {
    if(!players.has(m.a)||!players.has(m.b)||m.a===m.b || players.get(m.a).gender!==players.get(m.b).gender) fail('Invalid player pairing');
    if(!SURFACES[m.surface] || !CIRCUITS.includes(m.circuit)) fail('Invalid surface or circuit');
    const women=['WTA','WTA 125','ITF Women'].includes(m.circuit);
    if(women !== (players.get(m.a).gender==='women')) fail('Circuit and player gender mismatch');
  };
  for(const m of data.matches) {
    pair(m);
    if(!data.coverage.includes(m.circuit))fail('Match outside declared coverage');
    if(!name(m.tournament)||!validTime(m.startAt)||!['scheduled','live','finished','postponed','cancelled'].includes(m.status)||![3,5].includes(m.bestOf)||m.discipline!=='singles') fail('Invalid match');
  }
  const cutoff=Date.parse(data.fetchedAt);
  for(const h of data.history) {
    pair(h);
    if(!validTime(h.endedAt)||Date.parse(h.endedAt)>cutoff||!validTime(h.observedAt)||Date.parse(h.observedAt)>cutoff||Date.parse(h.observedAt)<Date.parse(h.endedAt)||!['completed','retired','walkover'].includes(h.status)||![h.a,h.b].includes(h.winner)||h.discipline!=='singles') fail('Invalid history');
  }
  if(!Array.isArray(data.injuries)) fail('Missing injury reports array');
  for(const report of data.injuries) {
    if(!players.has(report.playerId)||!['reported','cleared'].includes(report.status)||!validTime(report.publishedAt)||Date.parse(report.publishedAt)>cutoff||!name(report.title)||typeof report.sourceUrl!=='string') fail('Invalid injury report');
    try {if(new URL(report.sourceUrl).protocol!=='https:') fail('Invalid source');}catch{fail('Invalid source');}
  }
  if(data.playerStats !== undefined) {
    if(!Array.isArray(data.playerStats)||data.playerStats.length>100000)fail('Invalid player statistics');
    const keys=new Set();
    for(const s of data.playerStats){
      const key=`${s.playerId}:${s.season}:${s.surface}`;
      if(keys.has(key)||!players.has(s.playerId)||!Number.isInteger(s.season)||s.season<1900||!['all',...Object.keys(SURFACES)].includes(s.surface)||!validTime(s.asOf)||Date.parse(s.asOf)>cutoff)fail('Invalid statistics scope');
      keys.add(key);
      const counts=['matches','servicePoints','firstServeIn','firstServeWon','secondServePoints','secondServeWon','breakPointsFaced','breakPointsSaved','breakOpportunities','breaksConverted','aces','doubleFaults'];
      if(counts.some(k=>!Number.isSafeInteger(s[k])||s[k]<0)||s.matches===0)fail('Invalid statistics counts');
      if(s.firstServeIn+s.secondServePoints!==s.servicePoints||s.firstServeWon>s.firstServeIn||s.secondServeWon>s.secondServePoints||s.breakPointsSaved>s.breakPointsFaced||s.breaksConverted>s.breakOpportunities||s.doubleFaults>s.secondServePoints||s.aces>s.firstServeWon+s.secondServeWon)fail('Inconsistent statistics counts');
    }
  }
  return data;
}

export function playerSummary(playerId, history, match, cutoff) {
  const rows=history.filter(h=>h.id!==match.id && h.status==='completed' && Date.parse(h.endedAt)<cutoff && Date.parse(h.observedAt)<=cutoff && (h.a===playerId||h.b===playerId)).sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt));
  const year=new Date(match.startAt).getUTCFullYear();
  const season=rows.filter(h=>new Date(h.endedAt).getUTCFullYear()===year);
  const tally=list=>({played:list.length,won:list.filter(h=>h.winner===playerId).length});
  const surfaces=Object.keys(SURFACES).map(surface=>({surface,...tally(season.filter(h=>h.surface===surface))}));
  const eligible=surfaces.filter(s=>s.played>=5).sort((a,b)=>b.won/b.played-a.won/a.played || b.played-a.played);
  return {season:tally(season),surfaces,bestSurface:eligible[0]?.surface??null,recent:rows.slice(0,10).map(h=>({id:h.id,won:h.winner===playerId,opponent:h.a===playerId?h.b:h.a,surface:h.surface,endedAt:h.endedAt})),sampleSize:rows.length};
}

// Experimental chronological Elo, 50% overall + 50% surface. Not calibrated.
// No ranking, H2H, injury or odds substitutions; all exclusions are explicit.
export function analyzeMatch(data, match, now = Date.now()) {
  const cutoff=Math.min(now,Date.parse(data.fetchedAt),Date.parse(match.startAt));
  const history=data.history.filter(h=>h.id!==match.id&&h.status==='completed'&&Date.parse(h.endedAt)<cutoff&&Date.parse(h.observedAt)<=cutoff&&h.circuit && (['WTA','WTA 125','ITF Women'].includes(h.circuit)===['WTA','WTA 125','ITF Women'].includes(match.circuit))).sort((a,b)=>Date.parse(a.endedAt)-Date.parse(b.endedAt)||a.id.localeCompare(b.id));
  const ratings=new Map();
  const rating=id=>{if(!ratings.has(id))ratings.set(id,{overall:1500,hard:1500,clay:1500,grass:1500,count:0,surfaceCount:{hard:0,clay:0,grass:0},last:null});return ratings.get(id);};
  const expected=(a,b)=>1/(1+10**((b-a)/400));
  for(const h of history){
    const a=rating(h.a),b=rating(h.b),win=h.winner===h.a?1:0;
    for(const key of ['overall',h.surface]){const delta=24*(win-expected(a[key],b[key]));a[key]+=delta;b[key]-=delta;}
    for(const p of [a,b]){p.count++;p.surfaceCount[h.surface]++;p.last=h.endedAt;}
  }
  const a=rating(match.a),b=rating(match.b);
  const reports=data.injuries.filter(r=>[match.a,match.b].includes(r.playerId)&&Date.parse(r.publishedAt)<=cutoff).sort((x,y)=>Date.parse(y.publishedAt)-Date.parse(x.publishedAt));
  const latest=[match.a,match.b].map(id=>reports.find(r=>r.playerId===id));
  const reasons=[];
  if(match.status!=='scheduled'||Date.parse(match.startAt)<=now)reasons.push('El partido ya empezó o no está programado.');
  if(now-Date.parse(data.fetchedAt)>6*3600000)reasons.push('La actualización tiene más de seis horas.');
  if(Math.min(a.count,b.count)<20)reasons.push('Se necesitan al menos 20 partidos completos por jugador.');
  if(Math.min(a.surfaceCount[match.surface],b.surfaceCount[match.surface])<8)reasons.push('Se necesitan al menos 8 partidos por jugador en esta superficie.');
  if([a,b].some(p=>!p.last || now-Date.parse(p.last)>180*86400000))reasons.push('Historial reciente insuficiente: más de 180 días sin partido registrado.');
  if(latest.some(r=>r?.status==='reported'))reasons.push('Existe una incidencia física reportada; requiere revisión.');
  const blendedA=(a.overall+a[match.surface])/2,blendedB=(b.overall+b[match.surface])/2;
  const h2h=history.filter(h=>[h.a,h.b].includes(match.a)&&[h.a,h.b].includes(match.b));
  return {modelVersion:MODEL_VERSION,status:reasons.length?'abstained':'experimental',probabilityA:reasons.length?null:expected(blendedA,blendedB),reasons,
    ratings:[a,b].map(p=>({overall:Math.round(p.overall),surface:Math.round(p[match.surface]),matches:p.count,surfaceMatches:p.surfaceCount[match.surface]})),
    summaries:[match.a,match.b].map(id=>playerSummary(id,history,match,cutoff)),
    h2h:{aWins:h2h.filter(h=>h.winner===match.a).length,bWins:h2h.filter(h=>h.winner===match.b).length,matches:h2h.slice(-5).reverse()},
    injuryReports:latest.map(r=>r??null),asOf:new Date(cutoff).toISOString(),calibrated:false,
    serviceStats:[match.a,match.b].map(id=>(data.playerStats||[]).find(s=>s.playerId===id&&s.season===new Date(match.startAt).getUTCFullYear()&&s.surface==='all'&&Date.parse(s.asOf)<=cutoff)??null),
    warnings:['Estimación experimental; no hay rentabilidad ni calibración demostrada.','H2H e incidencias se muestran como contexto; no se convierten en ajustes numéricos inventados.',...(latest.some(r=>!r)?['Sin informe de lesiones no significa sin lesiones.']:[])]};
}
