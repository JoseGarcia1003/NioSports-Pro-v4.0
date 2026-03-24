// src/lib/services/games-service.js
// ════════════════════════════════════════════════════════════════
// Servicio para obtener partidos NBA del día
// Usa BallDontLie API con fallback a datos demo
// ════════════════════════════════════════════════════════════════

import { TEAM_NAME_MAP } from '$lib/engine/team-mapping.js';

const API_BASE = 'https://api.balldontlie.io/v1';

// Invertir el mapeo para convertir nombre corto a completo
const TEAM_NAME_REVERSE = Object.fromEntries(
  Object.entries(TEAM_NAME_MAP).map(([full, short]) => [short, full])
);

/**
 * Convierte nombre completo de BallDontLie a nombre corto de nba-stats.json
 */
function toShortName(fullName) {
  if (!fullName) return null;
  if (TEAM_NAME_MAP[fullName]) return TEAM_NAME_MAP[fullName];

  for (const [full, short] of Object.entries(TEAM_NAME_MAP)) {
    if (fullName.includes(short) || full.includes(fullName)) {
      return short;
    }
  }

  return null;
}

/**
 * Formatea fecha a YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Obtiene partidos del día desde BallDontLie API
 * @param {string} apiKey - API key de BallDontLie (opcional)
 * @param {Date} date - Fecha a consultar (default: hoy)
 * @returns {Promise<Array|null>} - Lista de partidos formateados o null si falla la API
 */
export async function fetchTodayGames(apiKey = '', date = new Date()) {
  const dateStr = formatDate(date);

  // FIX: BallDontLie requiere Bearer token
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

  try {
    const params = new URLSearchParams({
      dates: dateStr,
      per_page: '15',
    });

    const res = await fetch(`${API_BASE}/games?${params.toString()}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();

    const games = (data.data || []).map((game) => ({
      id: game.id,
      date: game.date,
      time: game.status,
      status: game.status,
      homeTeam: toShortName(game.home_team?.full_name),
      homeTeamFull: game.home_team?.full_name,
      awayTeam: toShortName(game.visitor_team?.full_name),
      awayTeamFull: game.visitor_team?.full_name,
      homeScore: game.home_team_score,
      awayScore: game.visitor_team_score,
      isLive:
        game.status !== 'Final' &&
        game.status !== 'Scheduled' &&
        game.home_team_score > 0,
      isFinal: game.status === 'Final',
      // Campos para líneas (se llenarán con The Odds API después)
      lines: {
        Q1: null,
        HALF: null,
        FULL: null,
      },
    }));

    // Filtrar juegos con equipos válidos
    return games.filter((g) => g.homeTeam && g.awayTeam);
  } catch (error) {
    console.warn('Error fetching games from API:', error.message);
    return null; // Retorna null para indicar que debe usar demo
  }
}

/**
 * Genera partidos demo para cuando no hay API o no hay juegos
 * @param {Object} teamStats - Estadísticas de equipos
 * @returns {Array} - Lista de partidos demo
 */
export function generateDemoGames(teamStats) {
  const teams = Object.keys(teamStats).filter(
    (t) => !t.startsWith('_') && t !== 'leagueAverages'
  );

  if (teams.length < 10) {
    // Usar lista hardcoded si no hay suficientes equipos
    const defaultTeams = [
      'Thunder',
      'Nuggets',
      'Celtics',
      'Lakers',
      'Heat',
      'Warriors',
      'Bucks',
      'Suns',
      '76ers',
      'Mavericks',
    ];

    teams.push(...defaultTeams.filter((t) => !teams.includes(t)));
  }

  // Generar 4-6 partidos demo
  const numGames = 4 + Math.floor(Math.random() * 3);
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const games = [];

  for (let i = 0; i < numGames && i * 2 + 1 < shuffled.length; i++) {
    const homeTeam = shuffled[i * 2];
    const awayTeam = shuffled[i * 2 + 1];

    // Generar líneas realistas basadas en promedios de equipos
    const homeStats = teamStats[homeTeam];
    const awayStats = teamStats[awayTeam];

    let fullLine = 220;

    if (homeStats && awayStats) {
      const homeAvg = homeStats.fullHome || homeStats.full || 115;
      const awayAvg = awayStats.fullAway || awayStats.full || 115;
      fullLine = Math.round((homeAvg + awayAvg) * 2) / 2;
    }

    games.push({
      id: `demo-${i + 1}`,
      date: formatDate(new Date()),
      time: `${19 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'} ET`,
      status: 'Scheduled',
      homeTeam,
      homeTeamFull: TEAM_NAME_REVERSE[homeTeam] || homeTeam,
      awayTeam,
      awayTeamFull: TEAM_NAME_REVERSE[awayTeam] || awayTeam,
      homeScore: 0,
      awayScore: 0,
      isLive: false,
      isFinal: false,
      isDemo: true,
      lines: {
        Q1: Math.round(fullLine * 0.25 * 2) / 2,
        HALF: Math.round(fullLine * 0.48 * 2) / 2,
        FULL: fullLine,
      },
    });
  }

  return games;
}

/**
 * Obtiene partidos del día con fallback a demo
 * @param {Object} options - Opciones
 * @returns {Promise<{games: Array, isDemo: boolean, reason?: string}>}
 */
export async function getGamesToday(options = {}) {
  const { apiKey = '', teamStats = {}, forceDemo = false } = options;

  if (forceDemo) {
    return {
      games: generateDemoGames(teamStats),
      isDemo: true,
    };
  }

  const apiGames = await fetchTodayGames(apiKey);

  if (apiGames && apiGames.length > 0) {
    return {
      games: apiGames,
      isDemo: false,
    };
  }

  // No hay juegos hoy o la API falló - usar demo
  return {
    games: generateDemoGames(teamStats),
    isDemo: true,
    reason: apiGames === null ? 'API error' : 'No games today',
  };
}