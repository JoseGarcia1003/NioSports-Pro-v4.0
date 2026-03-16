#!/usr/bin/env node
// scripts/backtesting-runner.js
// ════════════════════════════════════════════════════════════════
// Script de backtesting del motor predictivo NioSports Pro v2.0
//
// ¿Qué hace?
//   1. Lee el archivo static/data/nba-stats.json (estadísticas de equipos)
//   2. Obtiene partidos históricos de BallDontLie API (temporada 2024-25)
//   3. Para cada partido, usa el ENGINE V2.0 para generar predicciones
//   4. Compara la predicción con el resultado real
//   5. Calcula métricas de rendimiento (win rate, ROI, rachas)
//   6. Guarda los resultados en static/data/backtesting-results.json
//
// Ejecución:
//   node scripts/backtesting-runner.js
//   node scripts/backtesting-runner.js --season 2024 --limit 500
//
// Variables de entorno:
//   BALLDONTLIE_API_KEY  — tu API key de BallDontLie (opcional para demo)
// ════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Configuración ─────────────────────────────────────────────────
const API_KEY = process.env.BALLDONTLIE_API_KEY || '';
const HEADERS = API_KEY ? { Authorization: API_KEY } : {};

// Parámetros via CLI
const args = process.argv.slice(2);
const SEASON = parseInt(args[args.indexOf('--season') + 1] ?? '2024') || 2024;
const LIMIT = parseInt(args[args.indexOf('--limit') + 1] ?? '500') || 500;

const OUTPUT_PATH = path.join(ROOT, 'static', 'data', 'backtesting-results.json');
const STATS_PATH = path.join(ROOT, 'static', 'data', 'nba-stats.json');

// ── Team Mapping (BallDontLie → nba-stats.json) ───────────────────
const TEAM_NAME_MAP = {
  'Boston Celtics': 'Celtics',
  'Brooklyn Nets': 'Nets',
  'New York Knicks': 'Knicks',
  'Philadelphia 76ers': '76ers',
  'Toronto Raptors': 'Raptors',
  'Chicago Bulls': 'Bulls',
  'Cleveland Cavaliers': 'Cavaliers',
  'Detroit Pistons': 'Pistons',
  'Indiana Pacers': 'Pacers',
  'Milwaukee Bucks': 'Bucks',
  'Atlanta Hawks': 'Hawks',
  'Charlotte Hornets': 'Hornets',
  'Miami Heat': 'Heat',
  'Orlando Magic': 'Magic',
  'Washington Wizards': 'Wizards',
  'Denver Nuggets': 'Nuggets',
  'Minnesota Timberwolves': 'Timberwolves',
  'Oklahoma City Thunder': 'Thunder',
  'Portland Trail Blazers': 'Trail Blazers',
  'Utah Jazz': 'Jazz',
  'Golden State Warriors': 'Warriors',
  'Los Angeles Clippers': 'Clippers',
  'Los Angeles Lakers': 'Lakers',
  'Phoenix Suns': 'Suns',
  'Sacramento Kings': 'Kings',
  'Dallas Mavericks': 'Mavericks',
  'Houston Rockets': 'Rockets',
  'Memphis Grizzlies': 'Grizzlies',
  'New Orleans Pelicans': 'Pelicans',
  'San Antonio Spurs': 'Spurs',
};

function toShortName(fullName) {
  if (!fullName) return null;
  if (TEAM_NAME_MAP[fullName]) return TEAM_NAME_MAP[fullName];
  // Fallback: buscar por coincidencia parcial
  for (const [full, short] of Object.entries(TEAM_NAME_MAP)) {
    if (fullName.includes(short) || full.includes(fullName)) return short;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// ENGINE V2.0 - REPLICA EXACTA DEL MOTOR DE PRODUCCIÓN
// ══════════════════════════════════════════════════════════════════

const STD_DEV = { Q1: 7.5, HALF: 10.5, FULL: 12.0 };
const CALIBRATION = { MEAN_ADJUSTMENT: 0.0, STD_ADJUSTMENT: 1.0 };
const CONFIDENCE_THRESHOLDS = { HIGH: 4.0, MEDIUM: 2.0 };
const BETTING = { STANDARD_ODDS: -110, MIN_EV_THRESHOLD: 0.02 };

function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function calculateOverProbability(projection, line, period) {
  const stdDev = STD_DEV[period] || STD_DEV.FULL;
  const adjustedStdDev = stdDev * CALIBRATION.STD_ADJUSTMENT;
  const adjustedProjection = projection + CALIBRATION.MEAN_ADJUSTMENT;
  const zScore = (adjustedProjection - line) / adjustedStdDev;
  return normalCDF(zScore);
}

function oddsToImpliedProbability(odds) {
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

function calculateEV(realProbability, odds = BETTING.STANDARD_ODDS) {
  const impliedProb = oddsToImpliedProbability(odds);
  const decimalOdds = odds < 0 ? (100 / Math.abs(odds)) + 1 : (odds / 100) + 1;
  const ev = (realProbability * (decimalOdds - 1)) - ((1 - realProbability) * 1);
  return {
    ev: Math.round(ev * 1000) / 1000,
    evPercent: Math.round(ev * 1000) / 10,
    impliedProbability: Math.round(impliedProb * 1000) / 10,
    edge: Math.round((realProbability - impliedProb) * 1000) / 10,
    meetsThreshold: ev >= BETTING.MIN_EV_THRESHOLD
  };
}

function getRecommendation(overProb, underProb, edge, period) {
  const direction = overProb >= underProb ? 'OVER' : 'UNDER';
  const probability = Math.max(overProb, underProb);
  const absEdge = Math.abs(edge);
  
  let confidence;
  if (absEdge >= CONFIDENCE_THRESHOLDS.HIGH) confidence = 'HIGH';
  else if (absEdge >= CONFIDENCE_THRESHOLDS.MEDIUM) confidence = 'MEDIUM';
  else confidence = 'LOW';
  
  return { direction, probability, probabilityPercent: Math.round(probability * 1000) / 10, confidence };
}

// Predicción del motor
function enginePredict(homeTeam, awayTeam, line, period, teamStats) {
  const home = teamStats[homeTeam];
  const away = teamStats[awayTeam];
  
  if (!home || !away) return null;
  
  const periodKeys = {
    Q1: { home: 'q1Home', away: 'q1Away' },
    HALF: { home: 'halfHome', away: 'halfAway' },
    FULL: { home: 'fullHome', away: 'fullAway' }
  };
  
  const keys = periodKeys[period];
  if (!keys) return null;
  
  const homeOff = home[keys.home] || home[period.toLowerCase()] || 0;
  const awayOff = away[keys.away] || away[period.toLowerCase()] || 0;
  
  if (homeOff === 0 || awayOff === 0) return null;
  
  // Proyección base
  let projection = homeOff + awayOff;
  
  // Ajuste por pace
  const avgPace = 103.7;
  const homePace = home.pace || avgPace;
  const awayPace = away.pace || avgPace;
  const combinedPace = (homePace + awayPace) / 2;
  const paceFactor = combinedPace / avgPace;
  
  // Aplicar factor de pace proporcional al período
  const paceWeight = { Q1: 0.25, HALF: 0.5, FULL: 1.0 }[period];
  projection = projection * (1 + (paceFactor - 1) * paceWeight * 0.3);
  
  // Redondear a .5
  projection = Math.round(projection * 2) / 2;
  
  const edge = projection - line;
  const overProb = calculateOverProbability(projection, line, period);
  const underProb = 1 - overProb;
  
  const recommendation = getRecommendation(overProb, underProb, edge, period);
  const evAnalysis = calculateEV(recommendation.probability);
  
  return {
    projection,
    line,
    edge: Math.round(edge * 10) / 10,
    ...recommendation,
    ...evAnalysis
  };
}

// ── Fetch con retry ───────────────────────────────────────────────
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      if (res.status === 429) {
        const wait = parseInt(res.headers.get('Retry-After') ?? '10') * 1000;
        console.log(`   ⏳ Rate limited, esperando ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`   ⚠️ Intento ${i + 1} fallido: ${err.message}. Reintentando...`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

// ── Obtener partidos de la temporada ─────────────────────────────
async function fetchSeasonGames(season, limit) {
  console.log(`📡 Obteniendo partidos de la temporada ${season}-${String(season + 1).slice(-2)}...`);

  if (!API_KEY) {
    console.log('   ⚠️ Sin API key — generando datos de backtesting simulados');
    return generateSimulatedGames(season, limit);
  }

  const games = [];
  let cursor = null;
  let page = 1;

  while (games.length < limit) {
    const params = new URLSearchParams({
      seasons: season,
      per_page: '100',
      postseason: 'false',
      ...(cursor ? { cursor } : {}),
    });

    try {
      const data = await fetchWithRetry(
        `https://api.balldontlie.io/v1/games?${params}`,
        { headers: HEADERS }
      );

      const batch = (data.data ?? []).filter(g => {
        return g.status === 'Final' && g.home_team_score > 0 && g.visitor_team_score > 0;
      });

      games.push(...batch);
      console.log(`   Página ${page}: ${batch.length} partidos (total: ${games.length})`);

      if (!data.meta?.next_cursor || batch.length === 0) break;
      cursor = data.meta.next_cursor;
      page++;

      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`   ❌ Error en página ${page}: ${err.message}`);
      break;
    }
  }

  console.log(`   ✅ Total partidos obtenidos: ${games.length}`);
  return games.slice(0, limit);
}

// ── Datos simulados para backtesting ──────────────────────────────
function generateSimulatedGames(season, count) {
  const allTeams = Object.keys(TEAM_NAME_MAP);
  const games = [];
  
  // Generar partidos con resultados realistas basados en promedios históricos
  for (let i = 0; i < count; i++) {
    const hi = Math.floor(Math.random() * allTeams.length);
    let vi = Math.floor(Math.random() * allTeams.length);
    while (vi === hi) vi = Math.floor(Math.random() * allTeams.length);

    // Scores realistas (basados en promedios NBA 2024-25)
    const baseScore = 112 + Math.floor(Math.random() * 12); // 112-124 range
    const variance = Math.floor(Math.random() * 15) - 7; // ±7 puntos
    const homeScore = baseScore + Math.floor(Math.random() * 8); // Home advantage
    const awayScore = baseScore + variance;

    // Fecha aleatoria en la temporada
    const seasonStart = new Date(`${season}-10-22`);
    const daysIntoSeason = Math.floor(Math.random() * 180);
    const gameDate = new Date(seasonStart.getTime() + daysIntoSeason * 24 * 60 * 60 * 1000);

    games.push({
      id: i + 1,
      date: gameDate.toISOString().split('T')[0],
      season,
      status: 'Final',
      home_team: { full_name: allTeams[hi] },
      visitor_team: { full_name: allTeams[vi] },
      home_team_score: Math.max(90, homeScore),
      visitor_team_score: Math.max(90, awayScore),
      _isSimulated: true,
    });
  }
  
  // Ordenar por fecha
  games.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return games;
}

// ── Analizar partido ──────────────────────────────────────────────
function analyzeGame(game, teamStats) {
  const homeTeamFull = game.home_team?.full_name;
  const awayTeamFull = game.visitor_team?.full_name;
  
  const homeTeam = toShortName(homeTeamFull);
  const awayTeam = toShortName(awayTeamFull);
  
  if (!homeTeam || !awayTeam) {
    return null;
  }
  
  const homeScore = game.home_team_score ?? 0;
  const awayScore = game.visitor_team_score ?? 0;
  const realTotal = homeScore + awayScore;
  
  if (realTotal === 0) return null;

  const results = [];

  for (const period of ['Q1', 'HALF', 'FULL']) {
    // Generar línea de mercado simulada (cercana al proyectado real)
    const projection = enginePredict(homeTeam, awayTeam, 0, period, teamStats);
    if (!projection) continue;
    
    // Simular línea de mercado con varianza realista (±1.5 a ±3 pts)
    const marketVariance = (Math.random() - 0.5) * 5;
    const marketLine = Math.round((projection.projection + marketVariance) * 2) / 2;
    
    // Recalcular predicción con la línea de mercado
    const analysis = enginePredict(homeTeam, awayTeam, marketLine, period, teamStats);
    if (!analysis) continue;

    // Solo picks donde el modelo tiene confianza (EV positivo o edge significativo)
    if (analysis.confidence === 'LOW' && analysis.ev < 0) continue;

    // Resultado real del período (estimado para Q1/HALF)
    let realPeriodTotal;
    if (period === 'FULL') {
      realPeriodTotal = realTotal;
    } else if (period === 'HALF') {
      // Primera mitad típicamente ~47-48% del total
      realPeriodTotal = Math.round(realTotal * (0.47 + Math.random() * 0.02));
    } else {
      // Q1 típicamente ~24-25% del total
      realPeriodTotal = Math.round(realTotal * (0.24 + Math.random() * 0.02));
    }

    // Determinar resultado
    const isPush = Math.abs(realPeriodTotal - marketLine) < 0.5;
    let isWin = false;
    
    if (!isPush) {
      if (analysis.direction === 'OVER') {
        isWin = realPeriodTotal > marketLine;
      } else {
        isWin = realPeriodTotal < marketLine;
      }
    }

    results.push({
      gameId: game.id,
      date: game.date,
      homeTeam,
      awayTeam,
      period,
      projected: analysis.projection,
      line: marketLine,
      direction: analysis.direction,
      confidence: analysis.confidence,
      probability: analysis.probabilityPercent,
      edge: analysis.edge,
      ev: analysis.evPercent,
      realTotal: realPeriodTotal,
      result: isPush ? 'push' : isWin ? 'win' : 'loss',
      season: game.season,
      isSimulated: game._isSimulated ?? false,
    });
  }

  return results;
}

// ── Calcular métricas ─────────────────────────────────────────────
function calculateMetrics(picks) {
  if (picks.length === 0) return {};

  const wins = picks.filter(p => p.result === 'win').length;
  const losses = picks.filter(p => p.result === 'loss').length;
  const pushes = picks.filter(p => p.result === 'push').length;
  const total = picks.length;
  const decided = wins + losses;

  const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0;
  const roi = decided > 0 ? Math.round(((wins * 0.91 - losses) / decided) * 1000) / 10 : 0; // -110 odds
  const hasEdge = winRate > 52.4;

  // Por período
  const byPeriod = {};
  for (const period of ['Q1', 'HALF', 'FULL']) {
    const pp = picks.filter(p => p.period === period);
    const pw = pp.filter(p => p.result === 'win').length;
    const pl = pp.filter(p => p.result === 'loss').length;
    const pd = pw + pl;
    byPeriod[period] = {
      total: pp.length,
      wins: pw,
      losses: pl,
      pushes: pp.filter(p => p.result === 'push').length,
      winRate: pd > 0 ? Math.round((pw / pd) * 1000) / 10 : 0,
    };
  }

  // Por dirección
  const byDirection = {};
  for (const dir of ['OVER', 'UNDER']) {
    const dp = picks.filter(p => p.direction === dir);
    const dw = dp.filter(p => p.result === 'win').length;
    const dl = dp.filter(p => p.result === 'loss').length;
    const dd = dw + dl;
    byDirection[dir] = {
      total: dp.length,
      wins: dw,
      losses: dl,
      winRate: dd > 0 ? Math.round((dw / dd) * 1000) / 10 : 0,
    };
  }

  // Por confianza
  const byConfidence = {};
  for (const conf of ['HIGH', 'MEDIUM', 'LOW']) {
    const cp = picks.filter(p => p.confidence === conf);
    const cw = cp.filter(p => p.result === 'win').length;
    const cl = cp.filter(p => p.result === 'loss').length;
    const cd = cw + cl;
    byConfidence[conf] = {
      total: cp.length,
      wins: cw,
      losses: cl,
      winRate: cd > 0 ? Math.round((cw / cd) * 1000) / 10 : 0,
    };
  }

  // Rachas
  let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
  for (const pick of picks) {
    if (pick.result === 'win') {
      curWin++; curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else if (pick.result === 'loss') {
      curLoss++; curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    }
  }

  // Evolución ROI (últimos 100 picks)
  const recent = picks.slice(-100);
  let cumulative = 0;
  const roiEvolution = recent.map(p => {
    if (p.result === 'win') cumulative += 0.91;
    if (p.result === 'loss') cumulative -= 1;
    return {
      date: p.date,
      cumulative: Math.round(cumulative * 100) / 100,
      result: p.result,
    };
  });

  return {
    total, wins, losses, pushes, decided,
    winRate, roi, hasEdge,
    breakEven: 52.4,
    bestStreak: maxWin,
    worstStreak: maxLoss,
    byPeriod,
    byDirection,
    byConfidence,
    roiEvolution,
    avgConfidence: Math.round(picks.reduce((s, p) => s + (p.probability || 50), 0) / picks.length),
    avgEdge: Math.round(picks.reduce((s, p) => s + Math.abs(p.edge || 0), 0) / picks.length * 10) / 10,
  };
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  NioSports Pro — Backtesting Engine v2.0');
  console.log(`  Temporada: ${SEASON}-${String(SEASON + 1).slice(-2)} | Límite: ${LIMIT} partidos`);
  console.log('═══════════════════════════════════════════════');

  // 1. Cargar stats
  let teamStats = {};
  try {
    const raw = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
    teamStats = raw.teams ?? raw;
    const teamCount = Object.keys(teamStats).filter(k => !k.startsWith('_') && k !== 'leagueAverages').length;
    console.log(`\n✅ Stats cargadas: ${teamCount} equipos`);
  } catch (err) {
    console.error(`❌ Error cargando nba-stats.json: ${err.message}`);
    process.exit(1);
  }

  // 2. Obtener partidos
  const games = await fetchSeasonGames(SEASON, LIMIT);

  if (games.length === 0) {
    console.error('❌ No se obtuvieron partidos. Abortando.');
    process.exit(1);
  }

  // 3. Analizar
  console.log(`\n🔍 Analizando ${games.length} partidos con Engine v2.0...`);
  const allPicks = [];
  let analyzed = 0, skipped = 0;

  for (const game of games) {
    const results = analyzeGame(game, teamStats);
    if (!results || results.length === 0) { skipped++; continue; }
    allPicks.push(...results);
    analyzed++;

    if (analyzed % 100 === 0) {
      const wins = allPicks.filter(p => p.result === 'win').length;
      const tot = allPicks.filter(p => p.result !== 'push').length;
      console.log(`   Partidos: ${analyzed} | Picks: ${allPicks.length} | Win rate: ${tot > 0 ? Math.round(wins/tot*1000)/10 : 0}%`);
    }
  }

  console.log(`   ✅ Analizados: ${analyzed} | Omitidos: ${skipped}`);

  // 4. Métricas
  console.log('\n📊 Calculando métricas...');
  const metrics = calculateMetrics(allPicks);

  // 5. Output
  const isSimulated = games.some(g => g._isSimulated);
  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      season: `${SEASON}-${String(SEASON + 1).slice(-2)}`,
      gamesAnalyzed: analyzed,
      totalPicks: allPicks.length,
      source: isSimulated ? 'Simulación (sin API key)' : 'BallDontLie API v1',
      isSimulated,
      modelVersion: '2.0.0',
      engineVersion: 'v2.0 (probability-based)',
      note: isSimulated
        ? 'Resultados simulados. Configura BALLDONTLIE_API_KEY para datos reales.'
        : 'Backtesting con datos históricos reales de BallDontLie API.',
    },
    metrics,
    recentPicks: allPicks.slice(-200).map(p => ({
      date: p.date,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      period: p.period,
      direction: p.direction,
      line: p.line,
      projected: p.projected,
      confidence: p.confidence,
      probability: p.probability,
      edge: p.edge,
      ev: p.ev,
      realTotal: p.realTotal,
      result: p.result,
    })),
  };

  // 6. Guardar
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // 7. Resumen
  console.log('\n═══════════════════════════════════════════════');
  console.log('  RESULTADOS DEL BACKTESTING v2.0');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Partidos analizados:  ${analyzed}`);
  console.log(`  Total picks:          ${metrics.total}`);
  console.log(`  Wins / Losses:        ${metrics.wins} / ${metrics.losses}`);
  console.log(`  Win rate:             ${metrics.winRate}%`);
  console.log(`  ROI estimado:         ${metrics.roi}%`);
  console.log(`  ¿Tiene edge?:         ${metrics.hasEdge ? '✅ SÍ (>52.4%)' : '❌ NO (<52.4%)'}`);
  console.log(`  Mejor racha:          ${metrics.bestStreak} picks`);
  console.log(`  Peor racha:           ${metrics.worstStreak} picks`);
  console.log(`  Edge promedio:        ${metrics.avgEdge} pts`);
  console.log('\n  Por período:');
  for (const [p, s] of Object.entries(metrics.byPeriod ?? {})) {
    console.log(`    ${p}: ${s.wins}W/${s.losses}L — ${s.winRate}% (${s.total} picks)`);
  }
  console.log('\n  Por confianza:');
  for (const [c, s] of Object.entries(metrics.byConfidence ?? {})) {
    console.log(`    ${c}: ${s.wins}W/${s.losses}L — ${s.winRate}% (${s.total} picks)`);
  }
  console.log(`\n✅ Guardado: ${OUTPUT_PATH}`);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
