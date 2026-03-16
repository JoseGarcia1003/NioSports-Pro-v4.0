/**
 * @fileoverview Servicio de estadísticas NBA para NioSports Pro
 * Obtiene, procesa y cachea stats de equipos
 */

import { fetchLocalStats, fetchTeamStats, fetchGames } from './api-client.js';

// ═══════════════════════════════════════════════════════════════
// CACHE EN MEMORIA
// ═══════════════════════════════════════════════════════════════

const cache = {
  stats: null,
  lastFetch: null,
  ttl: 5 * 60 * 1000 // 5 minutos
};

/**
 * Verifica si el cache es válido
 * @returns {boolean}
 */
function isCacheValid() {
  if (!cache.stats || !cache.lastFetch) return false;
  return Date.now() - cache.lastFetch < cache.ttl;
}

/**
 * Limpia el cache
 */
export function clearCache() {
  cache.stats = null;
  cache.lastFetch = null;
}

// ═══════════════════════════════════════════════════════════════
// OBTENCIÓN DE DATOS
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene todas las stats de equipos
 * @param {boolean} forceRefresh - Forzar actualización ignorando cache
 * @returns {Promise<Object>}
 */
export async function getAllTeamStats(forceRefresh = false) {
  // Usar cache si es válido
  if (!forceRefresh && isCacheValid()) {
    return {
      data: cache.stats,
      source: 'cache',
      timestamp: cache.lastFetch
    };
  }

  try {
    // Intentar obtener datos locales primero
    const localStats = await fetchLocalStats();
    
    if (localStats) {
      cache.stats = localStats;
      cache.lastFetch = Date.now();
      
      return {
        data: localStats,
        source: 'local',
        timestamp: Date.now()
      };
    }

    throw new Error('No local stats available');

  } catch (error) {
    console.error('[StatsService] Error fetching stats:', error);
    
    // Retornar cache expirado si existe
    if (cache.stats) {
      return {
        data: cache.stats,
        source: 'stale-cache',
        timestamp: cache.lastFetch,
        error: error.message
      };
    }

    throw error;
  }
}

/**
 * Obtiene stats de un equipo específico por nombre
 * @param {string} teamName - Nombre del equipo
 * @returns {Promise<Object|null>}
 */
export async function getTeamStats(teamName) {
  const { data } = await getAllTeamStats();
  
  if (!data) return null;

  // Buscar en el objeto de stats
  const normalizedName = normalizeTeamName(teamName);
  
  // Buscar por diferentes formatos de nombre
  for (const [key, stats] of Object.entries(data)) {
    if (normalizeTeamName(key) === normalizedName) {
      return { teamName: key, ...stats };
    }
  }

  return null;
}

/**
 * Obtiene stats de dos equipos para un matchup
 * @param {string} homeTeam - Nombre equipo local
 * @param {string} awayTeam - Nombre equipo visitante
 * @returns {Promise<{home: Object, away: Object}>}
 */
export async function getMatchupStats(homeTeam, awayTeam) {
  const [home, away] = await Promise.all([
    getTeamStats(homeTeam),
    getTeamStats(awayTeam)
  ]);

  return { home, away };
}

// ═══════════════════════════════════════════════════════════════
// PROCESAMIENTO DE STATS
// ═══════════════════════════════════════════════════════════════

/**
 * Normaliza nombre de equipo para búsqueda
 * @param {string} name
 * @returns {string}
 */
export function normalizeTeamName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extrae stats por período de un objeto de stats
 * @param {Object} stats - Stats del equipo
 * @param {string} period - Período ('Q1', 'HALF', 'FULL')
 * @param {boolean} isHome - Si es equipo local
 * @returns {Object}
 */
export function extractPeriodStats(stats, period, isHome = true) {
  if (!stats) return null;

  const suffix = isHome ? 'Home' : 'Away';
  const periodLower = period.toLowerCase();

  return {
    points: stats[`${periodLower}${suffix}`] || stats[periodLower] || 0,
    last5: stats[`${periodLower}Last5`] || stats[`${periodLower}${suffix}`] || 0,
    last10: stats[`${periodLower}Last10`] || stats[`${periodLower}${suffix}`] || 0,
    season: stats[`${periodLower}Season`] || stats[`${periodLower}${suffix}`] || 0
  };
}

/**
 * Calcula stats agregadas de un equipo
 * @param {Object} stats
 * @returns {Object}
 */
export function calculateAggregateStats(stats) {
  if (!stats) return null;

  return {
    ppg: stats.ppg || stats.full || 0,
    oppPpg: stats.oppPpg || 0,
    pace: stats.pace || 100,
    offRtg: stats.offRtg || stats.ortg || 0,
    defRtg: stats.defRtg || stats.drtg || 0,
    netRtg: (stats.offRtg || 0) - (stats.defRtg || 0)
  };
}

// ═══════════════════════════════════════════════════════════════
// PARTIDOS DEL DÍA
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene los partidos de hoy con stats de equipos
 * @returns {Promise<Array>}
 */
export async function getTodayGamesWithStats() {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const [games, { data: allStats }] = await Promise.all([
      fetchGames(today),
      getAllTeamStats()
    ]);

    return games.map(game => ({
      ...game,
      homeStats: allStats?.[game.home_team?.full_name] || null,
      awayStats: allStats?.[game.visitor_team?.full_name] || null
    }));

  } catch (error) {
    console.error('[StatsService] Error getting today games:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// DETECCIÓN DE CONTEXTO
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula días de descanso desde el último partido
 * @param {string} lastGameDate - Fecha del último partido (ISO)
 * @param {string} currentDate - Fecha actual (ISO)
 * @returns {number}
 */
export function calculateRestDays(lastGameDate, currentDate) {
  if (!lastGameDate || !currentDate) return 3; // Default

  const last = new Date(lastGameDate);
  const current = new Date(currentDate);
  const diffTime = current - last;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays - 1); // -1 porque el día del partido no cuenta
}

/**
 * Detecta si un equipo está en back-to-back
 * @param {Array<string>} recentGames - Fechas de partidos recientes
 * @param {string} gameDate - Fecha del partido
 * @returns {boolean}
 */
export function isBackToBack(recentGames, gameDate) {
  if (!recentGames || recentGames.length === 0) return false;
  return calculateRestDays(recentGames[0], gameDate) === 0;
}

/**
 * Construye objeto de contexto para el predictor
 * @param {Object} teamData - Datos del equipo
 * @param {Object} gameInfo - Info del partido
 * @returns {Object}
 */
export function buildTeamContext(teamData, gameInfo = {}) {
  const recentGames = teamData?.recentGameDates || [];
  const restDays = calculateRestDays(recentGames[0], gameInfo.date);

  return {
    stats: teamData,
    restDays,
    recentGames,
    injuries: teamData?.injuries || [],
    travelMiles: teamData?.travelMiles || 0,
    timezoneChange: teamData?.timezoneChange || 0
  };
}

// ═══════════════════════════════════════════════════════════════
// ESTADO DEL SERVICIO
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene estado del servicio de stats
 * @returns {Object}
 */
export function getServiceStatus() {
  return {
    hasCachedData: cache.stats !== null,
    cacheAge: cache.lastFetch ? Date.now() - cache.lastFetch : null,
    isCacheValid: isCacheValid(),
    teamCount: cache.stats ? Object.keys(cache.stats).length : 0
  };
}