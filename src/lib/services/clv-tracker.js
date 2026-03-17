// src/lib/services/clv-tracker.js
// CLV (Closing Line Value) Tracker Service
// Preparado para integrar con The Odds API

/**
 * CLV (Closing Line Value) es la métrica más importante para medir
 * si un apostador tiene edge real sobre el mercado.
 * 
 * CLV = Línea cuando apostamos - Línea de cierre
 * 
 * Si apostamos OVER 220.5 y la línea cierra en 222.5:
 * CLV = 220.5 - 222.5 = -2.0 (conseguimos 2 puntos de valor)
 * 
 * Un CLV positivo sostenido indica que consistentemente encontramos
 * valor antes de que el mercado lo corrija.
 */

// Configuración de la API de Odds (para cuando esté disponible)
const ODDS_API_CONFIG = {
  baseUrl: 'https://api.the-odds-api.com/v4',
  sport: 'basketball_nba',
  markets: 'totals',
  regions: 'us',
  oddsFormat: 'american',
  // La API key se configurará en variables de entorno
  // apiKey: import.meta.env.VITE_ODDS_API_KEY
};

/**
 * Estado del servicio
 */
let isConfigured = false;
let apiKey = null;

/**
 * Configura el servicio con la API key
 * @param {string} key - API key de The Odds API
 */
export function configure(key) {
  if (!key) {
    console.warn('[CLV Tracker] No API key provided');
    return false;
  }
  apiKey = key;
  isConfigured = true;
  console.log('[CLV Tracker] Service configured successfully');
  return true;
}

/**
 * Verifica si el servicio está configurado
 */
export function isReady() {
  return isConfigured && apiKey !== null;
}

/**
 * Obtiene las líneas actuales de totales para un partido
 * @param {string} homeTeam - Nombre del equipo local
 * @param {string} awayTeam - Nombre del equipo visitante
 * @returns {Promise<Object|null>} - Líneas actuales o null si no disponible
 */
export async function getCurrentLines(homeTeam, awayTeam) {
  if (!isReady()) {
    console.warn('[CLV Tracker] Service not configured. Using fallback.');
    return null;
  }

  try {
    const url = new URL(`${ODDS_API_CONFIG.baseUrl}/sports/${ODDS_API_CONFIG.sport}/odds`);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('regions', ODDS_API_CONFIG.regions);
    url.searchParams.append('markets', ODDS_API_CONFIG.markets);
    url.searchParams.append('oddsFormat', ODDS_API_CONFIG.oddsFormat);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const games = await response.json();
    
    // Buscar el partido específico
    const game = games.find(g => 
      normalizeTeamName(g.home_team).includes(normalizeTeamName(homeTeam)) ||
      normalizeTeamName(g.away_team).includes(normalizeTeamName(awayTeam))
    );

    if (!game) {
      console.warn(`[CLV Tracker] Game not found: ${awayTeam} @ ${homeTeam}`);
      return null;
    }

    // Extraer líneas de totales de los bookmakers
    const totalsLines = extractTotalsLines(game);
    
    return {
      gameId: game.id,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      commenceTime: game.commence_time,
      lines: totalsLines,
      consensus: calculateConsensusLine(totalsLines),
      fetchedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[CLV Tracker] Error fetching lines:', error);
    return null;
  }
}

/**
 * Obtiene la línea de cierre para un partido (15 min antes del inicio)
 * @param {string} gameId - ID del partido
 * @returns {Promise<Object|null>}
 */
export async function getClosingLine(gameId) {
  if (!isReady()) {
    return null;
  }

  try {
    // La Odds API permite obtener odds históricos con el plan premium
    // Por ahora, simplemente obtenemos las líneas actuales
    // En producción, esto se llamaría justo antes del partido
    
    const url = new URL(`${ODDS_API_CONFIG.baseUrl}/sports/${ODDS_API_CONFIG.sport}/events/${gameId}/odds`);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('regions', ODDS_API_CONFIG.regions);
    url.searchParams.append('markets', ODDS_API_CONFIG.markets);
    url.searchParams.append('oddsFormat', ODDS_API_CONFIG.oddsFormat);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const game = await response.json();
    const totalsLines = extractTotalsLines(game);
    
    return {
      gameId: game.id,
      closingLine: calculateConsensusLine(totalsLines),
      fetchedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[CLV Tracker] Error fetching closing line:', error);
    return null;
  }
}

/**
 * Calcula el CLV para un pick
 * @param {Object} pick - El pick con lineAtPick y closingLine
 * @returns {number|null} - CLV en puntos o null si no calculable
 */
export function calculateCLV(pick) {
  const { lineAtPick, closingLine, betType } = pick;
  
  if (lineAtPick == null || closingLine == null) {
    return null;
  }

  // Para OVER: queremos que la línea suba (conseguimos puntos más baratos)
  // Para UNDER: queremos que la línea baje (conseguimos puntos más caros)
  
  if (betType === 'OVER') {
    // Si apostamos OVER 220 y cierra en 222, CLV = +2 (bueno)
    return closingLine - lineAtPick;
  } else {
    // Si apostamos UNDER 220 y cierra en 218, CLV = +2 (bueno)
    return lineAtPick - closingLine;
  }
}

/**
 * Interpreta el CLV para mostrar al usuario
 * @param {number} clv - Valor de CLV
 * @returns {Object} - { value, label, color, isPositive }
 */
export function interpretCLV(clv) {
  if (clv == null) {
    return { value: null, label: 'N/A', color: 'neutral', isPositive: null };
  }

  const absClv = Math.abs(clv);
  const isPositive = clv > 0;

  let label;
  if (absClv >= 2) {
    label = isPositive ? 'Excelente valor' : 'Mal timing';
  } else if (absClv >= 1) {
    label = isPositive ? 'Buen valor' : 'Valor negativo';
  } else if (absClv >= 0.5) {
    label = isPositive ? 'Ligero valor' : 'Ligero contra';
  } else {
    label = 'Neutral';
  }

  return {
    value: clv,
    label,
    color: isPositive ? 'positive' : clv < 0 ? 'negative' : 'neutral',
    isPositive
  };
}

/**
 * Extrae las líneas de totales de los bookmakers
 */
function extractTotalsLines(game) {
  const lines = [];
  
  if (!game.bookmakers) return lines;

  for (const bookmaker of game.bookmakers) {
    const totalsMarket = bookmaker.markets?.find(m => m.key === 'totals');
    if (!totalsMarket) continue;

    const overOutcome = totalsMarket.outcomes?.find(o => o.name === 'Over');
    const underOutcome = totalsMarket.outcomes?.find(o => o.name === 'Under');

    if (overOutcome) {
      lines.push({
        bookmaker: bookmaker.key,
        title: bookmaker.title,
        line: overOutcome.point,
        overOdds: overOutcome.price,
        underOdds: underOutcome?.price
      });
    }
  }

  return lines;
}

/**
 * Calcula la línea de consenso (promedio ponderado)
 */
function calculateConsensusLine(lines) {
  if (!lines || lines.length === 0) return null;
  
  // Bookmakers principales tienen más peso
  const premiumBooks = ['pinnacle', 'fanduel', 'draftkings', 'betmgm'];
  
  let totalWeight = 0;
  let weightedSum = 0;

  for (const line of lines) {
    const weight = premiumBooks.includes(line.bookmaker) ? 2 : 1;
    weightedSum += line.line * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 2) / 2 : null;
}

/**
 * Normaliza nombre de equipo para comparación
 */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace('losangeles', 'la');
}

/**
 * Guarda la línea al momento de hacer el pick
 * Esta función se llama cuando el usuario guarda un pick
 * @param {Object} pick - El pick a guardar
 * @returns {Object} - Pick con lineAtPick agregado
 */
export async function recordLineAtPick(pick) {
  // Si el servicio está configurado, obtener línea real
  if (isReady()) {
    const currentLines = await getCurrentLines(pick.localTeam, pick.awayTeam);
    if (currentLines?.consensus) {
      return {
        ...pick,
        lineAtPick: pick.line, // La línea que el usuario está apostando
        marketLine: currentLines.consensus, // La línea del mercado
        lineRecordedAt: new Date().toISOString()
      };
    }
  }

  // Fallback: usar la línea del pick como referencia
  return {
    ...pick,
    lineAtPick: pick.line,
    marketLine: null,
    lineRecordedAt: new Date().toISOString()
  };
}

/**
 * Programa la obtención de la línea de cierre
 * Se debe llamar cuando se guarda un pick para programar
 * la obtención de la closing line antes del partido
 * @param {Object} pick - El pick guardado
 * @param {Function} callback - Función a llamar con la closing line
 */
export function scheduleClosingLineCheck(pick, callback) {
  // En una implementación completa, esto usaría un cron job o 
  // serverless function para obtener la línea 15 min antes del partido
  
  // Por ahora, solo registramos la intención
  console.log(`[CLV Tracker] Scheduled closing line check for: ${pick.awayTeam} @ ${pick.localTeam}`);
  
  // En producción, aquí se programaría:
  // 1. Calcular tiempo hasta 15 min antes del partido
  // 2. Programar una función serverless para ese momento
  // 3. Actualizar el pick con la closing line
  
  return {
    pickId: pick.id,
    scheduledFor: 'Pre-game (15 min)',
    status: 'pending'
  };
}

// Exportar todo como objeto para facilitar importación
export default {
  configure,
  isReady,
  getCurrentLines,
  getClosingLine,
  calculateCLV,
  interpretCLV,
  recordLineAtPick,
  scheduleClosingLineCheck
};