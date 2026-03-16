/**
 * @fileoverview Cliente HTTP centralizado para NioSports Pro
 * Maneja requests a APIs externas con retry, timeout y error handling
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  baseUrl: '/api/proxy',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
};

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

/**
 * Espera un tiempo determinado
 * @param {number} ms - Milisegundos
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crea un AbortController con timeout
 * @param {number} ms - Timeout en milisegundos
 * @returns {{controller: AbortController, timeoutId: number}}
 */
function createTimeoutController(ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { controller, timeoutId };
}

// ═══════════════════════════════════════════════════════════════
// CLIENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

/**
 * Realiza un request HTTP con retry y timeout
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} options - Opciones del request
 * @param {string} options.method - Método HTTP
 * @param {Object} options.params - Query params
 * @param {Object} options.body - Body del request
 * @param {number} options.timeout - Timeout personalizado
 * @param {number} options.retries - Número de reintentos
 * @returns {Promise<Object>} Respuesta parseada
 */
export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    params = {},
    body = null,
    timeout = CONFIG.timeout,
    retries = CONFIG.retries
  } = options;

  // Construir URL con params
  const url = new URL(endpoint, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  // Configurar request
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  // Ejecutar con retry
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { controller, timeoutId } = createTimeoutController(timeout);
      fetchOptions.signal = controller.signal;

      const response = await fetch(url.toString(), fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await response.text()
        );
      }

      const data = await response.json();
      return {
        success: true,
        data,
        status: response.status
      };

    } catch (error) {
      lastError = error;

      // No reintentar si fue cancelado manualmente o es error 4xx
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Esperar antes de reintentar
      if (attempt < retries) {
        await delay(CONFIG.retryDelay * (attempt + 1));
      }
    }
  }

  throw lastError;
}

// ═══════════════════════════════════════════════════════════════
// MÉTODOS CONVENIENTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET request
 * @param {string} endpoint
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export function get(endpoint, params = {}) {
  return request(endpoint, { method: 'GET', params });
}

/**
 * POST request
 * @param {string} endpoint
 * @param {Object} body
 * @returns {Promise<Object>}
 */
export function post(endpoint, body = {}) {
  return request(endpoint, { method: 'POST', body });
}

// ═══════════════════════════════════════════════════════════════
// API ESPECÍFICAS
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene datos de la API de NBA (via proxy)
 * @param {string} resource - Recurso (games, teams, stats, etc.)
 * @param {Object} params - Parámetros de la API
 * @returns {Promise<Object>}
 */
export async function fetchNBAData(resource, params = {}) {
  try {
    const response = await get(`${CONFIG.baseUrl}/${resource}`, params);
    return response.data;
  } catch (error) {
    console.error(`[API] Error fetching ${resource}:`, error);
    throw error;
  }
}

/**
 * Obtiene partidos del día
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function fetchGames(date) {
  const response = await fetchNBAData('games', { 
    'dates[]': date 
  });
  return response.data || [];
}

/**
 * Obtiene stats de un equipo
 * @param {number} teamId - ID del equipo
 * @param {string} season - Temporada (ej: "2025")
 * @returns {Promise<Object>}
 */
export async function fetchTeamStats(teamId, season) {
  const response = await fetchNBAData('season_averages', {
    team_id: teamId,
    season
  });
  return response.data?.[0] || null;
}

/**
 * Obtiene stats locales desde JSON estático
 * @returns {Promise<Object>}
 */
export async function fetchLocalStats() {
  try {
    const response = await fetch('/data/nba-stats.json');
    if (!response.ok) {
      throw new Error('Failed to load local stats');
    }
    return await response.json();
  } catch (error) {
    console.error('[API] Error loading local stats:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

/**
 * Error personalizado para la API
 */
export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Verifica si un error es de red/timeout
 * @param {Error} error
 * @returns {boolean}
 */
export function isNetworkError(error) {
  return (
    error.name === 'TypeError' ||
    error.message.includes('fetch') ||
    error.status === 408
  );
}

/**
 * Verifica si un error es de rate limiting
 * @param {Error} error
 * @returns {boolean}
 */
export function isRateLimitError(error) {
  return error.status === 429;
}

// ═══════════════════════════════════════════════════════════════
// ESTADO DE CONEXIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Verifica si la API está disponible
 * @returns {Promise<{available: boolean, latency: number}>}
 */
export async function checkApiHealth() {
  const start = Date.now();
  try {
    await get(`${CONFIG.baseUrl}/health`, {});
    return {
      available: true,
      latency: Date.now() - start
    };
  } catch {
    return {
      available: false,
      latency: -1
    };
  }
}