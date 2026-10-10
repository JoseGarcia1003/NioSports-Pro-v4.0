// Isolated presentation fixture. Never passed to prediction, catalog or bankroll APIs.
export const RESEARCH_DEMO = Object.freeze({ id: 'nio-research-demo-1', origin: 'synthetic', label: 'Ejemplo interactivo · equipos y resultados ficticios' });
const series = [
  [218,231,224,239,212,228,235,221,242,226,230,219,237,225,233,216,240,229,222,234],
  [207,218,211,226,219,205,232,214,221,209,224,216,213,229,208,220,215,231,217,223],
  [236,224,241,218,230,245,227,238,221,234,243,229,217,240,232,226,248,235,223,239],
  [212,226,219,231,215,224,209,233,220,218,227,214,236,222,210,230,225,217,234,221],
  [241,229,235,248,226,239,232,244,221,237,250,230,242,234,228,246,236,225,240,231],
  [204,218,211,225,208,220,215,202,229,213,221,207,224,216,210,227,219,205,223,214]
];
const pairs = [['Ámbar','Índigo','AM','IN',227.5],['Coral','Oliva','CO','OL',218.5],['Cobalto','Marfil','CB','MA',233.5],['Cobre','Jade','CU','JA',223],['Violeta','Ónix','VI','ON',237.5],['Turquesa','Granate','TU','GR',215.5]];
export const DEMO_MATCHES = pairs.map(([home,away,homeCode,awayCode,line],i)=>({
  id:`demo-match-${i+1}`, home:`Club ${home}`, away:`Club ${away}`, homeCode, awayCode, line,
  history: series[i].map((total,j)=>({id:`demo-${i}-${j}`,label:`M${j+1}`,total,venue:j%2===0?'home':'away'}))
}));

export function researchSample(history, count=10, venue='all') {
  // Venue filter applies before taking the last N eligible observations.
  return history.filter(row=>venue==='all'||row.venue===venue).slice(-count);
}
export function summarizeResearch(rows,line) {
  if(!rows.length)return {n:0,mean:null,over:0,under:0,push:0,minimum:null,maximum:null};
  return {n:rows.length,mean:rows.reduce((s,r)=>s+r.total,0)/rows.length,
    over:rows.filter(r=>r.total>line).length,under:rows.filter(r=>r.total<line).length,
    push:rows.filter(r=>r.total===line).length,
    minimum:Math.min(...rows.map(r=>r.total)),maximum:Math.max(...rows.map(r=>r.total))};
}
export function filterResearch(matches,{query='',onlySaved=false,saved=[],sort='mean',count=10,venue='all'}={}) {
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  const text=normalize(query.trim());
  return matches.filter(m=>(!onlySaved||saved.includes(m.id))&&normalize(`${m.home} ${m.away}`).includes(text))
    .map(match=>({...match,summary:summarizeResearch(researchSample(match.history,count,venue),match.line)}))
    .sort((a,b)=>sort==='line'?a.line-b.line:(b.summary.mean??-Infinity)-(a.summary.mean??-Infinity));
}
