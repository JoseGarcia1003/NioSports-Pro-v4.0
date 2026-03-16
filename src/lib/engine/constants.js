/**
 * @fileoverview Constantes del motor predictivo NioSports Pro
 * Todas las constantes están documentadas con fuente y fecha de validación.
 */

// ═══════════════════════════════════════════════════════════════
// DESVIACIONES ESTÁNDAR POR PERÍODO
// Fuente: Análisis de 3 temporadas NBA (2021-2024)
// Última validación: Marzo 2026
// ═══════════════════════════════════════════════════════════════

export const STD_DEV = {
  Q1: 4.8,
  Q2: 4.9,
  Q3: 5.0,
  Q4: 5.2,
  HALF: 7.2,
  FULL: 10.5
};

// ═══════════════════════════════════════════════════════════════
// AJUSTES CONTEXTUALES (en puntos)
// Cada ajuste tiene: valor, rango de confianza, fuente
// ═══════════════════════════════════════════════════════════════

export const ADJUSTMENTS = {
  // Descanso
  B2B: {
    value: -2.8,
    range: [-3.6, -2.0],
    description: 'Back-to-back (segundo juego consecutivo)',
    source: 'NBA historical data 2019-2024'
  },
  B2B_ROAD: {
    value: -3.5,
    range: [-4.5, -2.5],
    description: 'Back-to-back en carretera',
    source: 'NBA historical data 2019-2024'
  },
  THREE_IN_FOUR: {
    value: -4.0,
    range: [-5.0, -3.0],
    description: 'Tercer juego en 4 noches',
    source: 'NBA historical data 2019-2024'
  },
  FOUR_PLUS_REST: {
    value: 1.2,
    range: [0.5, 2.0],
    description: '4+ días de descanso',
    source: 'NBA historical data 2019-2024'
  },

  // Viaje
  TRAVEL_LONG: {
    value: -1.5,
    range: [-2.5, -0.5],
    description: 'Viaje largo (>2000 millas)',
    source: 'Travel impact studies'
  },
  TRAVEL_TIMEZONE: {
    value: -1.0,
    range: [-1.8, -0.2],
    description: 'Cambio de zona horaria (>2 horas)',
    source: 'Travel impact studies'
  },

  // Contexto de arena
  ALTITUDE_DENVER: {
    value: 1.2,
    range: [0.5, 2.0],
    description: 'Altitud Denver (home advantage)',
    source: 'Denver Nuggets home/away splits'
  },
  ALTITUDE_DENVER_VISITOR: {
    value: -1.8,
    range: [-2.5, -1.0],
    description: 'Visitante en Denver (fatiga por altitud)',
    source: 'Visitor performance at altitude'
  },

  // Lesiones (por tipo de jugador)
  STAR_OUT: {
    value: -4.5,
    range: [-6.0, -3.0],
    description: 'Estrella fuera (top-10 usage rate)',
    source: 'Impact analysis of star players'
  },
  STARTER_OUT: {
    value: -2.0,
    range: [-3.0, -1.0],
    description: 'Titular fuera (no estrella)',
    source: 'Lineup impact analysis'
  },
  ROTATION_OUT: {
    value: -0.8,
    range: [-1.5, -0.2],
    description: 'Jugador de rotación fuera',
    source: 'Lineup impact analysis'
  },

  // Contexto de temporada
  PLAYOFFS: {
    value: -2.0,
    range: [-3.0, -1.0],
    description: 'Partido de playoffs (juego más lento)',
    source: 'Playoff pace analysis'
  },
  SEASON_FINALE: {
    value: -3.0,
    range: [-5.0, -1.0],
    description: 'Final de temporada (descanso de estrellas)',
    source: 'End of season analysis'
  },
  RIVALRY: {
    value: 1.5,
    range: [0.5, 2.5],
    description: 'Partido de rivalidad histórica',
    source: 'Rivalry game analysis'
  }
};

// ═══════════════════════════════════════════════════════════════
// PESOS DE RECENCIA
// ═══════════════════════════════════════════════════════════════

export const RECENCY_WEIGHTS = {
  LAST_5: 0.45,
  LAST_10: 0.30,
  SEASON: 0.25
};

// ═══════════════════════════════════════════════════════════════
// CALIBRACIÓN DEL MODELO
// ═══════════════════════════════════════════════════════════════

export const CALIBRATION = {
  // Corrección de sesgo de sobreestimación
  OVERESTIMATION_BIAS: {
    Q1: 0.2,
    Q2: 0.2,
    Q3: 0.3,
    Q4: 0.3,
    HALF: 0.4,
    FULL: 0.8
  },
  // Factor de shrinkage para proyecciones extremas
  SHRINKAGE_FACTOR: 0.05,
  // Umbral para aplicar shrinkage (desviaciones de la media)
  SHRINKAGE_THRESHOLD: 15
};

// ═══════════════════════════════════════════════════════════════
// UMBRALES DE CONFIANZA
// ═══════════════════════════════════════════════════════════════

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 65,      // >= 65% = alta confianza
  MEDIUM: 55,    // >= 55% = media confianza
  LOW: 50        // < 55% = baja confianza
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE PERÍODOS
// ═══════════════════════════════════════════════════════════════

export const PERIODS = {
  Q1: { id: 'Q1', label: 'Q1', order: 1 },
  Q2: { id: 'Q2', label: 'Q2', order: 2 },
  Q3: { id: 'Q3', label: 'Q3', order: 3 },
  Q4: { id: 'Q4', label: 'Q4', order: 4 },
  HALF: { id: 'HALF', label: '1st Half', order: 5 },
  FULL: { id: 'FULL', label: 'Full Game', order: 6 }
};

// ═══════════════════════════════════════════════════════════════
// LÍNEAS DE APUESTAS
// ═══════════════════════════════════════════════════════════════

export const BETTING = {
  STANDARD_JUICE: -110,
  BREAK_EVEN_WIN_RATE: 0.524,  // 52.4% para -110
  MIN_EV_THRESHOLD: 0.02      // 2% EV mínimo para recomendar
};

// ═══════════════════════════════════════════════════════════════
// VERSIÓN DEL MODELO
// ═══════════════════════════════════════════════════════════════

export const MODEL_VERSION = {
  version: '2.0.0',
  lastUpdated: '2026-03-15',
  description: 'Motor predictivo con distribución normal y calibración histórica'
};