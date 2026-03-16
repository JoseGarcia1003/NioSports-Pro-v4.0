/**
 * @fileoverview Utilidades de validación para NioSports Pro
 */

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN DE TIPOS BÁSICOS
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica si un valor es un número válido
 * @param {any} value
 * @returns {boolean}
 */
export function isValidNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Verifica si un valor es un número positivo
 * @param {any} value
 * @returns {boolean}
 */
export function isPositiveNumber(value) {
  return isValidNumber(value) && value > 0;
}

/**
 * Verifica si un valor es un string no vacío
 * @param {any} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Verifica si un valor es un objeto no nulo
 * @param {any} value
 * @returns {boolean}
 */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Verifica si un valor es un array no vacío
 * @param {any} value
 * @returns {boolean}
 */
export function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN DE DATOS NBA
// ═══════════════════════════════════════════════════════════════

/**
 * Períodos válidos
 */
const VALID_PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'HALF', 'FULL'];

/**
 * Verifica si un período es válido
 * @param {string} period
 * @returns {boolean}
 */
export function isValidPeriod(period) {
  return VALID_PERIODS.includes(period);
}

/**
 * Verifica si una línea de apuesta es válida
 * @param {number} line
 * @param {string} period
 * @returns {{valid: boolean, error?: string}}
 */
export function validateLine(line, period = 'FULL') {
  if (!isValidNumber(line)) {
    return { valid: false, error: 'La línea debe ser un número' };
  }

  // Rangos razonables por período
  const ranges = {
    Q1: { min: 40, max: 80 },
    Q2: { min: 40, max: 80 },
    Q3: { min: 40, max: 80 },
    Q4: { min: 40, max: 80 },
    HALF: { min: 90, max: 140 },
    FULL: { min: 180, max: 260 }
  };

  const range = ranges[period] || ranges.FULL;

  if (line < range.min || line > range.max) {
    return { 
      valid: false, 
      error: `Línea fuera de rango para ${period} (${range.min}-${range.max})` 
    };
  }

  return { valid: true };
}

/**
 * Verifica si una proyección es válida
 * @param {number} projection
 * @param {string} period
 * @returns {{valid: boolean, error?: string}}
 */
export function validateProjection(projection, period = 'FULL') {
  if (!isValidNumber(projection)) {
    return { valid: false, error: 'La proyección debe ser un número' };
  }

  if (projection <= 0) {
    return { valid: false, error: 'La proyección debe ser positiva' };
  }

  // Rangos razonables por período
  const ranges = {
    Q1: { min: 35, max: 85 },
    Q2: { min: 35, max: 85 },
    Q3: { min: 35, max: 85 },
    Q4: { min: 35, max: 85 },
    HALF: { min: 80, max: 150 },
    FULL: { min: 170, max: 280 }
  };

  const range = ranges[period] || ranges.FULL;

  if (projection < range.min || projection > range.max) {
    return { 
      valid: false, 
      error: `Proyección fuera de rango para ${period} (${range.min}-${range.max})` 
    };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN DE STATS DE EQUIPO
// ═══════════════════════════════════════════════════════════════

/**
 * Campos requeridos en stats de equipo
 */
const REQUIRED_STAT_FIELDS = ['q1Home', 'q1Away', 'halfHome', 'halfAway', 'fullHome', 'fullAway'];

/**
 * Verifica si las stats de un equipo son válidas
 * @param {Object} stats
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateTeamStats(stats) {
  const errors = [];
  const warnings = [];

  if (!isObject(stats)) {
    return { valid: false, errors: ['Stats debe ser un objeto'], warnings: [] };
  }

  // Verificar campos requeridos
  for (const field of REQUIRED_STAT_FIELDS) {
    if (stats[field] === undefined) {
      warnings.push(`Campo ${field} no encontrado`);
    } else if (!isValidNumber(stats[field])) {
      errors.push(`Campo ${field} no es un número válido`);
    }
  }

  // Validar rangos de valores
  const numericFields = Object.entries(stats).filter(([_, v]) => typeof v === 'number');
  
  for (const [field, value] of numericFields) {
    if (field.includes('q1') || field.includes('Q1')) {
      if (value < 15 || value > 45) {
        warnings.push(`${field}=${value} fuera de rango típico Q1 (15-45)`);
      }
    } else if (field.includes('half') || field.includes('Half')) {
      if (value < 40 || value > 80) {
        warnings.push(`${field}=${value} fuera de rango típico HALF (40-80)`);
      }
    } else if (field.includes('full') || field.includes('Full') || field === 'ppg') {
      if (value < 85 || value > 140) {
        warnings.push(`${field}=${value} fuera de rango típico FULL (85-140)`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN DE PICKS
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica si un pick es válido para guardar
 * @param {Object} pick
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePick(pick) {
  const errors = [];

  if (!isObject(pick)) {
    return { valid: false, errors: ['Pick debe ser un objeto'] };
  }

  // Campos requeridos
  if (!isNonEmptyString(pick.homeTeam)) {
    errors.push('Equipo local requerido');
  }

  if (!isNonEmptyString(pick.awayTeam)) {
    errors.push('Equipo visitante requerido');
  }

  if (!isValidPeriod(pick.period)) {
    errors.push('Período inválido');
  }

  if (!isValidNumber(pick.line)) {
    errors.push('Línea requerida');
  }

  if (!isValidNumber(pick.projection)) {
    errors.push('Proyección requerida');
  }

  if (!['OVER', 'UNDER'].includes(pick.direction)) {
    errors.push('Dirección debe ser OVER o UNDER');
  }

  if (!isValidNumber(pick.probability) || pick.probability < 0 || pick.probability > 1) {
    errors.push('Probabilidad debe estar entre 0 y 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN DE PARÁMETROS DEL MODELO
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica si los parámetros de predicción son válidos
 * @param {Object} params
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePredictParams(params) {
  const errors = [];

  if (!isObject(params)) {
    return { valid: false, errors: ['Parámetros deben ser un objeto'] };
  }

  if (!isObject(params.homeTeam)) {
    errors.push('homeTeam requerido');
  }

  if (!isObject(params.awayTeam)) {
    errors.push('awayTeam requerido');
  }

  if (!isValidNumber(params.line)) {
    errors.push('line requerida');
  }

  if (params.period && !isValidPeriod(params.period)) {
    errors.push('period inválido');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN DE FECHAS
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica si una fecha es válida
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isValidDate(date) {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Verifica si una fecha es hoy o futura
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isFutureOrToday(date) {
  if (!isValidDate(date)) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

/**
 * Verifica si una fecha está en la temporada NBA actual
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isInNBASeason(date) {
  if (!isValidDate(date)) return false;
  
  const d = new Date(date);
  const month = d.getMonth(); // 0-11
  
  // Temporada NBA: Octubre (9) - Junio (5)
  return month >= 9 || month <= 5;
}

// ═══════════════════════════════════════════════════════════════
// SANITIZACIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitiza un número, retornando default si es inválido
 * @param {any} value
 * @param {number} defaultValue
 * @returns {number}
 */
export function sanitizeNumber(value, defaultValue = 0) {
  if (isValidNumber(value)) return value;
  const parsed = parseFloat(value);
  return isValidNumber(parsed) ? parsed : defaultValue;
}

/**
 * Sanitiza un string
 * @param {any} value
 * @param {string} defaultValue
 * @returns {string}
 */
export function sanitizeString(value, defaultValue = '') {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return defaultValue;
  return String(value).trim();
}

/**
 * Clamp un número dentro de un rango
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(sanitizeNumber(value), min), max);
}