/**
 * @fileoverview Utilidades de formateo para NioSports Pro
 */

// ═══════════════════════════════════════════════════════════════
// NÚMEROS Y PORCENTAJES
// ═══════════════════════════════════════════════════════════════

/**
 * Formatea un número con decimales específicos
 * @param {number} value
 * @param {number} decimals
 * @returns {string}
 */
export function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return Number(value).toFixed(decimals);
}

/**
 * Formatea un porcentaje
 * @param {number} value - Valor entre 0-1 o 0-100
 * @param {number} decimals
 * @returns {string}
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  
  // Si el valor es menor a 1, asumimos que es 0-1
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Formatea puntos con signo
 * @param {number} value
 * @returns {string}
 */
export function formatPoints(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)}`;
}

/**
 * Formatea Expected Value
 * @param {number} ev - EV en unidades
 * @returns {string}
 */
export function formatEV(ev) {
  if (ev === null || ev === undefined || isNaN(ev)) return '-';
  const sign = ev > 0 ? '+' : '';
  return `${sign}${formatNumber(ev, 2)}u`;
}

// ═══════════════════════════════════════════════════════════════
// ODDS Y APUESTAS
// ═══════════════════════════════════════════════════════════════

/**
 * Formatea odds americanos
 * @param {number} odds
 * @returns {string}
 */
export function formatOdds(odds) {
  if (odds === null || odds === undefined || isNaN(odds)) return '-';
  const sign = odds > 0 ? '+' : '';
  return `${sign}${Math.round(odds)}`;
}

/**
 * Formatea línea de apuesta
 * @param {number} line
 * @param {string} direction - 'OVER' | 'UNDER'
 * @returns {string}
 */
export function formatLine(line, direction = null) {
  if (line === null || line === undefined) return '-';
  const prefix = direction ? `${direction} ` : '';
  return `${prefix}${formatNumber(line)}`;
}

/**
 * Formatea edge sobre la línea
 * @param {number} edge
 * @returns {string}
 */
export function formatEdge(edge) {
  if (edge === null || edge === undefined || isNaN(edge)) return '-';
  const sign = edge > 0 ? '+' : '';
  return `${sign}${formatNumber(edge)} pts`;
}

// ═══════════════════════════════════════════════════════════════
// CONFIANZA Y RECOMENDACIONES
// ═══════════════════════════════════════════════════════════════

/**
 * Formatea nivel de confianza para display
 * @param {string} confidence - 'HIGH' | 'MEDIUM' | 'LOW'
 * @returns {{label: string, color: string, emoji: string}}
 */
export function formatConfidence(confidence) {
  const configs = {
    HIGH: { label: 'Alta', color: 'text-green-400', emoji: '🔥' },
    MEDIUM: { label: 'Media', color: 'text-yellow-400', emoji: '⚡' },
    LOW: { label: 'Baja', color: 'text-gray-400', emoji: '❄️' }
  };
  return configs[confidence] || configs.LOW;
}

/**
 * Formatea dirección del pick
 * @param {string} direction - 'OVER' | 'UNDER'
 * @returns {{label: string, color: string, icon: string}}
 */
export function formatDirection(direction) {
  if (direction === 'OVER') {
    return { label: 'OVER', color: 'text-green-400', icon: '↑' };
  }
  return { label: 'UNDER', color: 'text-red-400', icon: '↓' };
}

/**
 * Formatea recomendación completa para display
 * @param {Object} prediction
 * @returns {string}
 */
export function formatRecommendation(prediction) {
  const { direction, line, probabilityPercent, confidence } = prediction;
  const conf = formatConfidence(confidence);
  return `${direction} ${formatNumber(line)} (${formatPercent(probabilityPercent, 0)}) ${conf.emoji}`;
}

// ═══════════════════════════════════════════════════════════════
// FECHAS Y TIEMPO
// ═══════════════════════════════════════════════════════════════

/**
 * Formatea fecha para display
 * @param {string|Date} date
 * @param {string} format - 'short' | 'long' | 'time'
 * @returns {string}
 */
export function formatDate(date, format = 'short') {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const options = {
    short: { month: 'short', day: 'numeric' },
    long: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    full: { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  };

  return d.toLocaleDateString('es-ES', options[format] || options.short);
}

/**
 * Formatea tiempo relativo (hace X minutos)
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTimeAgo(date) {
  if (!date) return '-';
  
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  
  return formatDate(date, 'short');
}

// ═══════════════════════════════════════════════════════════════
// EQUIPOS Y PARTIDOS
// ═══════════════════════════════════════════════════════════════

/**
 * Formatea nombre de equipo (versión corta)
 * @param {string} fullName
 * @returns {string}
 */
export function formatTeamShort(fullName) {
  if (!fullName) return '-';
  
  // Mapeo de nombres comunes
  const shortNames = {
    'Los Angeles Lakers': 'LAL',
    'Los Angeles Clippers': 'LAC',
    'Golden State Warriors': 'GSW',
    'Boston Celtics': 'BOS',
    'Miami Heat': 'MIA',
    'Phoenix Suns': 'PHX',
    'Milwaukee Bucks': 'MIL',
    'Denver Nuggets': 'DEN',
    'Philadelphia 76ers': 'PHI',
    'Brooklyn Nets': 'BKN',
    'New York Knicks': 'NYK',
    'Dallas Mavericks': 'DAL',
    'Memphis Grizzlies': 'MEM',
    'Sacramento Kings': 'SAC',
    'Cleveland Cavaliers': 'CLE',
    'New Orleans Pelicans': 'NOP',
    'Atlanta Hawks': 'ATL',
    'Chicago Bulls': 'CHI',
    'Toronto Raptors': 'TOR',
    'Minnesota Timberwolves': 'MIN',
    'Utah Jazz': 'UTA',
    'Oklahoma City Thunder': 'OKC',
    'Portland Trail Blazers': 'POR',
    'Indiana Pacers': 'IND',
    'Washington Wizards': 'WAS',
    'Orlando Magic': 'ORL',
    'Charlotte Hornets': 'CHA',
    'San Antonio Spurs': 'SAS',
    'Houston Rockets': 'HOU',
    'Detroit Pistons': 'DET'
  };

  return shortNames[fullName] || fullName.split(' ').pop().substring(0, 3).toUpperCase();
}

/**
 * Formatea matchup
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {boolean} short
 * @returns {string}
 */
export function formatMatchup(homeTeam, awayTeam, short = false) {
  if (short) {
    return `${formatTeamShort(awayTeam)} @ ${formatTeamShort(homeTeam)}`;
  }
  return `${awayTeam} @ ${homeTeam}`;
}

// ═══════════════════════════════════════════════════════════════
// PERÍODOS
// ═══════════════════════════════════════════════════════════════

/**
 * Formatea nombre de período
 * @param {string} period
 * @returns {string}
 */
export function formatPeriod(period) {
  const labels = {
    Q1: '1er Cuarto',
    Q2: '2do Cuarto',
    Q3: '3er Cuarto',
    Q4: '4to Cuarto',
    HALF: '1ra Mitad',
    FULL: 'Partido Completo'
  };
  return labels[period] || period;
}

/**
 * Formatea período versión corta
 * @param {string} period
 * @returns {string}
 */
export function formatPeriodShort(period) {
  const labels = {
    Q1: 'Q1',
    Q2: 'Q2',
    Q3: 'Q3',
    Q4: 'Q4',
    HALF: '1H',
    FULL: 'FG'
  };
  return labels[period] || period;
}