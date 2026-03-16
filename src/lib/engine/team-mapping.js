// src/lib/engine/team-mapping.js
// ════════════════════════════════════════════════════════════════
// Mapeo de nombres de equipos entre diferentes fuentes de datos
// ════════════════════════════════════════════════════════════════

/**
 * Mapeo: Nombre completo (BallDontLie API) → Nombre corto (nba-stats.json)
 */
export const TEAM_NAME_MAP = {
  // Atlantic Division
  'Boston Celtics': 'Celtics',
  'Brooklyn Nets': 'Nets',
  'New York Knicks': 'Knicks',
  'Philadelphia 76ers': '76ers',
  'Toronto Raptors': 'Raptors',
  
  // Central Division
  'Chicago Bulls': 'Bulls',
  'Cleveland Cavaliers': 'Cavaliers',
  'Detroit Pistons': 'Pistons',
  'Indiana Pacers': 'Pacers',
  'Milwaukee Bucks': 'Bucks',
  
  // Southeast Division
  'Atlanta Hawks': 'Hawks',
  'Charlotte Hornets': 'Hornets',
  'Miami Heat': 'Heat',
  'Orlando Magic': 'Magic',
  'Washington Wizards': 'Wizards',
  
  // Northwest Division
  'Denver Nuggets': 'Nuggets',
  'Minnesota Timberwolves': 'Timberwolves',
  'Oklahoma City Thunder': 'Thunder',
  'Portland Trail Blazers': 'Trail Blazers',
  'Utah Jazz': 'Jazz',
  
  // Pacific Division
  'Golden State Warriors': 'Warriors',
  'Los Angeles Clippers': 'Clippers',
  'Los Angeles Lakers': 'Lakers',
  'Phoenix Suns': 'Suns',
  'Sacramento Kings': 'Kings',
  
  // Southwest Division
  'Dallas Mavericks': 'Mavericks',
  'Houston Rockets': 'Rockets',
  'Memphis Grizzlies': 'Grizzlies',
  'New Orleans Pelicans': 'Pelicans',
  'San Antonio Spurs': 'Spurs',
};

/**
 * Mapeo inverso: Nombre corto → Nombre completo
 */
export const TEAM_NAME_REVERSE = Object.fromEntries(
  Object.entries(TEAM_NAME_MAP).map(([full, short]) => [short, full])
);

/**
 * Convierte nombre completo a nombre corto
 * @param {string} fullName - Nombre completo del equipo
 * @returns {string|null} - Nombre corto o null si no se encuentra
 */
export function toShortName(fullName) {
  if (!fullName) return null;
  
  // Buscar mapeo directo
  if (TEAM_NAME_MAP[fullName]) {
    return TEAM_NAME_MAP[fullName];
  }
  
  // Buscar por coincidencia parcial (por si viene sin ciudad)
  const lowerName = fullName.toLowerCase();
  for (const [full, short] of Object.entries(TEAM_NAME_MAP)) {
    if (full.toLowerCase().includes(lowerName) || lowerName.includes(short.toLowerCase())) {
      return short;
    }
  }
  
  return null;
}

/**
 * Convierte nombre corto a nombre completo
 * @param {string} shortName - Nombre corto del equipo
 * @returns {string|null} - Nombre completo o null si no se encuentra
 */
export function toFullName(shortName) {
  if (!shortName) return null;
  return TEAM_NAME_REVERSE[shortName] || null;
}

/**
 * Verifica si un nombre de equipo es válido
 * @param {string} name - Nombre del equipo (corto o completo)
 * @returns {boolean}
 */
export function isValidTeam(name) {
  if (!name) return false;
  return TEAM_NAME_MAP[name] !== undefined || TEAM_NAME_REVERSE[name] !== undefined;
}

/**
 * Obtiene todos los nombres cortos de equipos
 * @returns {string[]}
 */
export function getAllShortNames() {
  return Object.values(TEAM_NAME_MAP);
}

/**
 * Obtiene todos los nombres completos de equipos
 * @returns {string[]}
 */
export function getAllFullNames() {
  return Object.keys(TEAM_NAME_MAP);
}