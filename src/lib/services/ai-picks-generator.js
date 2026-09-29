import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
import { ARCHITECTURE_VERSION } from '$lib/prediction/contracts.js';
const abortIfNeeded=signal=>{if(signal?.aborted)throw new DOMException('Carga cancelada.','AbortError');};

// F3: request server-owned snapshots; never derive probabilities, EV or selections in the browser.
export async function generateAIPicks(games, _teamStats, options={}) {
  const {signal,now=Date.now(),periods=['FULL'],maxPicks=8}=options;
  abortIfNeeded(signal);
  if(!Array.isArray(games)||!Array.isArray(periods)||!Number.isSafeInteger(maxPicks)||maxPicks<=0)return [];
  if(!periods.includes('FULL'))return [];
  const seen=new Set();
  for(const game of games) {
    abortIfNeeded(signal);
    if(!game || game.id==null || seen.has(String(game.id)) || game.isDemo || game.isFinal || game.isLive ||
       /final|cancel|postpon|suspend|in.progress|live/i.test(game.status||'') ||
       game.homeScore>0 || game.awayScore>0 ||
       typeof game.homeTeam!=='string'||typeof game.awayTeam!=='string'||
       !game.homeTeam.trim()||!game.awayTeam.trim()||game.homeTeam.trim().toLowerCase()===game.awayTeam.trim().toLowerCase()||
       (game.startAt!=null&&(!Number.isFinite(Date.parse(game.startAt))||Date.parse(game.startAt)<=now))||
       !Number.isFinite(game.lines?.FULL)||game.lines.FULL<=0)continue;
    seen.add(String(game.id));
    if(typeof game.snapshotId!=='string'||!game.snapshotId)throw new Error('No hay una instantánea verificada para generar este análisis. El modelo NBA todavía no está habilitado.');
    const response=await authenticatedFetch('/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},
      signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),
      body:JSON.stringify({version:ARCHITECTURE_VERSION,snapshotId:game.snapshotId,
        market:{eventId:String(game.id),period:'FULL',line:game.lines.FULL}})});
    abortIfNeeded(signal);
    if(!response.ok)throw new Error(response.status===429?'Alcanzaste el límite de análisis.':
      [401,403].includes(response.status)?'Inicia sesión de nuevo.':'El servicio de análisis no está disponible.');
    const result=await response.json();
    abortIfNeeded(signal);
    if(result?.version!==ARCHITECTURE_VERSION || !['abstained','experimental'].includes(result.status) || result.recommendation!==null)
      throw new Error('El servicio devolvió un análisis inconsistente. No se publicaron resultados.');
    // No commercial policy is enabled in F3. A projection never becomes a pick via UI thresholds.
    throw new Error(typeof result.message==='string'?result.message:'No hay recomendaciones habilitadas.');
  }
  return [];
}

export function groupPicksByGame(picks) {
  const grouped = new Map();
  for (const pick of picks || []) {
    const key = pick.gameId ?? `${pick.gameDate}:${pick.homeTeam}:${pick.awayTeam}`;
    if (!grouped.has(key)) grouped.set(key, { homeTeam: pick.homeTeam, awayTeam: pick.awayTeam,
      homeTeamFull: pick.homeTeamFull, awayTeamFull: pick.awayTeamFull, gameTime: pick.gameTime, picks: [] });
    grouped.get(key).picks.push(pick);
  }
  return [...grouped.values()];
}

export function getPicksSummary(picks) {
  const rows = Array.isArray(picks) ? picks : [];
  const result = { total: rows.length, byPeriod: {}, byDirection: {}, byConfidence: {}, avgEV: null, avgEdge: 0, priced: 0 };
  let totalEV = 0;
  let totalEdge = 0;
  for (const pick of rows) {
    for (const [bucket, field] of [['byPeriod', 'period'], ['byDirection', 'direction'], ['byConfidence', 'confidence']]) {
      result[bucket][pick[field]] = (result[bucket][pick[field]] || 0) + 1;
    }
    if (Number.isFinite(pick.evPercent)) { totalEV += pick.evPercent; result.priced++; }
    if (Number.isFinite(pick.edge)) totalEdge += Math.abs(pick.edge);
  }
  result.avgEV = result.priced ? Math.round(totalEV / result.priced * 10) / 10 : null;
  result.avgEdge = rows.length ? Math.round(totalEdge / rows.length * 10) / 10 : 0;
  return result;
}
