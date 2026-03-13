#!/usr/bin/env node
// scripts/backtesting-runner.js
// ════════════════════════════════════════════════════════════════
// Script de backtesting del motor predictivo de NioSports Pro.
//
// ¿Qué hace?
//   1. Lee el archivo static/data/nba-stats.json (estadísticas de equipos)
//   2. Obtiene partidos históricos de BallDontLie API (temporada 2024-25)
//   3. Para cada partido, simula el pick que habría dado el modelo
//   4. Compara la predicción con el resultado real
//   5. Calcula métricas de rendimiento (win rate, ROI, rachas)
//   6. Guarda los resultados en static/data/backtesting-results.json
//
// Ejecución:
//   node scripts/backtesting-runner.js
//   node scripts/backtesting-runner.js --season 2023 --limit 200
//
// Variables de entorno requeridas:
//   BALLDONTLIE_API_KEY  — tu API key de BallDontLie
//
// El archivo de salida static/data/backtesting-results.json es
// consumido por la vista /stats para mostrar el historial del modelo.
// ════════════════════════════════════════════════════════════════

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── Configuración ─────────────────────────────────────────────────
const API_KEY = process.env.BALLDONTLIE_API_KEY || '';
const HEADERS = API_KEY ? { Authorization: API_KEY } : {};

// Parámetros via CLI
const args   = process.argv.slice(2);
const SEASON = parseInt(args[args.indexOf('--season') + 1] ?? '2024') || 2024;
const LIMIT  = parseInt(args[args.indexOf('--limit')  + 1] ?? '500')  || 500;

const OUTPUT_PATH = path.join(ROOT, 'static', 'data', 'backtesting-results.json');
const STATS_PATH  = path.join(ROOT, 'static', 'data', 'nba-stats.json');

// ── Modelo predictivo (replica picks-engine.js) ───────────────────
// IMPORTANTE: Esta función debe mantenerse sincronizada con la lógica
// real del motor en src/routes/totales/+page.svelte.
// Si cambias el modelo, actualiza también el backtesting.

function predictTotal(homeTeam, awayTeam, period, teamStats) {
  const home = teamStats[homeTeam];
  const away = teamStats[awayTeam];

  if (!home || !away) return null;

  // Factores base según período
  const periodKey = {
    'Q1':   { h: 'q1Home',   a: 'q1Away'   },
    'HALF': { h: 'halfHome', a: 'halfAway' },
    'FULL': { h: 'fullHome', a: 'fullAway' },
  }[period];

  if (!periodKey) return null;

  const homeBase = home[periodKey.h] ?? 0;
  const awayBase = away[periodKey.a] ?? 0;

  if (homeBase === 0 || awayBase === 0) return null;

  // Proyección base
  const base = homeBase + awayBase;

  // Ajuste por pace
  const homePace = home.pace ?? 99;
  const awayPace = away.pace ?? 99;
  const paceAdj  = ((homePace + awayPace) / 2 - 99) * 0.3;

  // Factor período (cuartos tienen más varianza)
  const periodFactor = period === 'Q1' ? 0.92 : period === 'HALF' ? 0.95 : 1.0;

  const projected = (base + paceAdj) * periodFactor;

  return Math.round(projected * 2) / 2; // Redondear a .5
}

function getEdge(projected, line) {
  if (!projected || !line) return 0;
  return Math.abs(projected - line);
}

function getDirection(projected, line) {
  if (!projected || !line) return null;
  return projected > line ? 'OVER' : 'UNDER';
}

function getConfidence(edge, period) {
  // Modelo simple: el edge relativo a la varianza esperada del período
  const variance = { Q1: 4.5, HALF: 7.0, FULL: 12.0 }[period] ?? 8;
  const raw      = 50 + (edge / variance) * 25;
  return Math.min(85, Math.max(50, Math.round(raw)));
}

// ── Fetch con retry ───────────────────────────────────────────────
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      if (res.status === 429) {
        // Rate limited — esperar y reintentar
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
    console.log('   ⚠️ Sin API key — usando datos demo para backtesting');
    return generateDemoGames(season, limit);
  }

  const games = [];
  let cursor  = null;
  let page    = 1;

  while (games.length < limit) {
    const params = new URLSearchParams({
      seasons:  season,
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
        // Solo partidos con resultado final y score válido
        return g.status === 'Final' && g.home_team_score > 0 && g.visitor_team_score > 0;
      });

      games.push(...batch);
      console.log(`   Página ${page}: ${batch.length} partidos (total: ${games.length})`);

      // Paginación con cursor
      if (!data.meta?.next_cursor || batch.length === 0) break;
      cursor = data.meta.next_cursor;
      page++;

      // Rate limit conservador
      await new Promise(r => setTimeout(r, 400));

    } catch (err) {
      console.error(`   ❌ Error en página ${page}: ${err.message}`);
      break;
    }
  }

  console.log(`   ✅ Total partidos obtenidos: ${games.length}`);
  return games.slice(0, limit);
}

// ── Datos demo para backtesting sin API key ───────────────────────
function generateDemoGames(season, count) {
  const teams = [
    'Los Angeles Lakers', 'Boston Celtics', 'Golden State Warriors',
    'Miami Heat', 'Denver Nuggets', 'Phoenix Suns', 'Milwaukee Bucks',
    'Philadelphia 76ers', 'Brooklyn Nets', 'Cleveland Cavaliers',
  ];

  const games = [];
  for (let i = 0; i < count; i++) {
    const hi = Math.floor(Math.random() * teams.length);
    let   vi = Math.floor(Math.random() * teams.length);
    while (vi === hi) vi = Math.floor(Math.random() * teams.length);

    const homeScore = 100 + Math.floor(Math.random() * 30);
    const awayScore = 100 + Math.floor(Math.random() * 30);

    games.push({
      id: i + 1,
      date: new Date(Date.now() - Math.random() * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      season,
      status: 'Final',
      home_team:        { full_name: teams[hi] },
      visitor_team:     { full_name: teams[vi] },
      home_team_score:  homeScore,
      visitor_team_score: awayScore,
      _isDemo: true,
    });
  }
  return games;
}

// ── Analizar partido y calcular resultado del pick ────────────────
function analyzeGame(game, teamStats) {
  const homeTeam = game.home_team?.full_name;
  const awayTeam = game.visitor_team?.full_name;
  const realTotal = (game.home_team_score ?? 0) + (game.visitor_team_score ?? 0);

  if (!homeTeam || !awayTeam || realTotal === 0) return null;

  const results = [];

  for (const period of ['Q1', 'HALF', 'FULL']) {
    const projected = predictTotal(homeTeam, awayTeam, period, teamStats);
    if (!projected) continue;

    // Simular una línea de mercado cercana al proyectado (±2 pts varianza)
    const marketLine = projected + (Math.random() - 0.5) * 3;
    const lineRounded = Math.round(marketLine * 2) / 2;

    const edge       = getEdge(projected, lineRounded);
    const direction  = getDirection(projected, lineRounded);
    const confidence = getConfidence(edge, period);

    // Solo picks con confianza ≥ 58% (el modelo recomendaría estos)
    if (confidence < 58) continue;

    // Resultado real del período
    let realPeriodTotal;
    if (period === 'FULL') {
      realPeriodTotal = realTotal;
    } else if (period === 'HALF') {
      // Estimamos la primera mitad como ~47% del total
      realPeriodTotal = Math.round(realTotal * 0.47);
    } else { // Q1
      // Estimamos el primer cuarto como ~24% del total
      realPeriodTotal = Math.round(realTotal * 0.24);
    }

    const isWin = direction === 'OVER'
      ? realPeriodTotal > lineRounded
      : realPeriodTotal < lineRounded;

    const isPush = Math.abs(realPeriodTotal - lineRounded) < 0.1;

    results.push({
      gameId:     game.id,
      date:       game.date,
      homeTeam,
      awayTeam,
      period,
      projected,
      line:       lineRounded,
      direction,
      confidence,
      edge:       Math.round(edge * 10) / 10,
      realTotal:  realPeriodTotal,
      result:     isPush ? 'push' : isWin ? 'win' : 'loss',
      season:     game.season,
      isDemo:     game._isDemo ?? false,
    });
  }

  return results;
}

// ── Calcular métricas globales ────────────────────────────────────
function calculateMetrics(picks) {
  if (picks.length === 0) return {};

  const wins   = picks.filter(p => p.result === 'win').length;
  const losses = picks.filter(p => p.result === 'loss').length;
  const pushes = picks.filter(p => p.result === 'push').length;
  const total  = picks.length;
  const decided = wins + losses; // Sin pushes

  const winRate  = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0;
  const roi      = decided > 0 ? Math.round(((wins - losses) / decided) * 1000) / 10 : 0;
  const hasEdge  = winRate > 52.4;

  // Métricas por período
  const byPeriod = {};
  for (const period of ['Q1', 'HALF', 'FULL']) {
    const pp = picks.filter(p => p.period === period);
    const pw = pp.filter(p => p.result === 'win').length;
    const pl = pp.filter(p => p.result === 'loss').length;
    const pd = pw + pl;
    byPeriod[period] = {
      total:   pp.length,
      wins:    pw,
      losses:  pl,
      pushes:  pp.filter(p => p.result === 'push').length,
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
      total:   dp.length,
      wins:    dw,
      losses:  dl,
      winRate: dd > 0 ? Math.round((dw / dd) * 1000) / 10 : 0,
    };
  }

  // Mejor y peor racha
  let streak = 0, maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
  for (const pick of picks) {
    if (pick.result === 'win') {
      curWin++; curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else if (pick.result === 'loss') {
      curLoss++; curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    }
  }

  // Evolución del ROI acumulado (últimos 50 picks para el gráfico)
  const recent = picks.slice(-50);
  let cumulative = 0;
  const roiEvolution = recent.map(p => {
    if (p.result === 'win')  cumulative++;
    if (p.result === 'loss') cumulative--;
    return {
      date:       p.date,
      cumulative,
      result: p.result,
    };
  });

  return {
    total, wins, losses, pushes, decided,
    winRate, roi, hasEdge,
    breakEven: 52.4,
    bestStreak:  maxWin,
    worstStreak: maxLoss,
    byPeriod,
    byDirection,
    roiEvolution,
    avgConfidence: Math.round(picks.reduce((s, p) => s + p.confidence, 0) / picks.length),
    highConfidence: {
      picks: picks.filter(p => p.confidence >= 68).length,
      winRate: (() => {
        const hp = picks.filter(p => p.confidence >= 68);
        const hw = hp.filter(p => p.result === 'win').length;
        const hl = hp.filter(p => p.result === 'loss').length;
        return hw + hl > 0 ? Math.round((hw / (hw + hl)) * 1000) / 10 : 0;
      })(),
    },
  };
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  NioSports Pro — Backtesting Runner');
  console.log(`  Temporada: ${SEASON}-${String(SEASON + 1).slice(-2)} | Límite: ${LIMIT} partidos`);
  console.log('═══════════════════════════════════════════════');

  // 1. Cargar estadísticas de equipos
  let teamStats = {};
  try {
    const raw = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
    // El JSON puede tener formato plano (equipos en raíz) o anidado (teams:{})
    teamStats = raw.teams ?? raw;
    console.log(`\n✅ Stats cargadas: ${Object.keys(teamStats).filter(k => !k.startsWith('_')).length} equipos`);
  } catch (err) {
    console.error(`❌ Error cargando nba-stats.json: ${err.message}`);
    console.log('   Asegúrate de que static/data/nba-stats.json existe.');
    process.exit(1);
  }

  // 2. Obtener partidos históricos
  const games = await fetchSeasonGames(SEASON, LIMIT);

  if (games.length === 0) {
    console.error('❌ No se obtuvieron partidos. Abortando.');
    process.exit(1);
  }

  // 3. Analizar cada partido
  console.log(`\n🔍 Analizando ${games.length} partidos...`);
  const allPicks = [];
  let analyzed = 0, skipped = 0;

  for (const game of games) {
    const results = analyzeGame(game, teamStats);
    if (!results || results.length === 0) { skipped++; continue; }
    allPicks.push(...results);
    analyzed++;

    if (analyzed % 50 === 0) {
      const wins = allPicks.filter(p => p.result === 'win').length;
      const tot  = allPicks.filter(p => p.result !== 'push').length;
      console.log(`   Partidos: ${analyzed} | Picks: ${allPicks.length} | Win rate actual: ${tot > 0 ? Math.round(wins/tot*100) : 0}%`);
    }
  }

  console.log(`   ✅ Analizados: ${analyzed} | Omitidos: ${skipped}`);

  // 4. Calcular métricas
  console.log('\n📊 Calculando métricas...');
  const metrics = calculateMetrics(allPicks);

  // 5. Preparar output
  const isDemo = games.some(g => g._isDemo);
  const output = {
    _meta: {
      generatedAt:  new Date().toISOString(),
      season:       `${SEASON}-${String(SEASON + 1).slice(-2)}`,
      gamesAnalyzed: analyzed,
      totalPicks:    allPicks.length,
      source:        isDemo ? 'demo — sin API key' : 'BallDontLie API v1',
      isDemo,
      modelVersion:  '2.5',
      note:          isDemo
        ? 'Estos resultados son simulados. Configura BALLDONTLIE_API_KEY para datos reales.'
        : 'Backtesting basado en datos históricos reales de BallDontLie API.',
    },
    metrics,
    // Guardar solo los últimos 200 picks para no inflar el JSON
    recentPicks: allPicks.slice(-200).map(p => ({
      date:       p.date,
      homeTeam:   p.homeTeam,
      awayTeam:   p.awayTeam,
      period:     p.period,
      direction:  p.direction,
      line:       p.line,
      confidence: p.confidence,
      result:     p.result,
    })),
  };

  // 6. Guardar
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // 7. Resumen
  console.log('\n═══════════════════════════════════════════════');
  console.log('  RESULTADOS DEL BACKTESTING');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Partidos analizados:  ${analyzed}`);
  console.log(`  Total picks:          ${metrics.total}`);
  console.log(`  Wins / Losses:        ${metrics.wins} / ${metrics.losses}`);
  console.log(`  Win rate:             ${metrics.winRate}%`);
  console.log(`  ROI estimado:         ${metrics.roi}%`);
  console.log(`  ¿Tiene edge?:         ${metrics.hasEdge ? '✅ SÍ (>52.4%)' : '❌ NO (<52.4%)'}`);
  console.log(`  Mejor racha:          ${metrics.bestStreak} picks`);
  console.log(`  Peor racha:           ${metrics.worstStreak} picks`);
  console.log('\n  Por período:');
  for (const [p, s] of Object.entries(metrics.byPeriod ?? {})) {
    console.log(`    ${p}: ${s.wins}W/${s.losses}L — ${s.winRate}% win rate`);
  }
  console.log(`\n✅ Guardado: ${OUTPUT_PATH}`);
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
