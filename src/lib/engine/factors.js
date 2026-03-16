/**
 * @fileoverview Cálculo de factores contextuales para ajuste de proyecciones
 * Cada factor retorna su ajuste en puntos y explicación
 */

import { ADJUSTMENTS } from './constants.js';

// ═══════════════════════════════════════════════════════════════
// FACTORES DE DESCANSO
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula ajuste por días de descanso
 * @param {number} restDays - Días desde el último partido
 * @param {boolean} isHome - Si juega de local
 * @returns {{adjustment: number, factor: string, description: string} | null}
 */
export function calculateRestAdjustment(restDays, isHome = true) {
  if (restDays === 0) {
    // Back-to-back
    const adj = isHome ? ADJUSTMENTS.B2B : ADJUSTMENTS.B2B_ROAD;
    return {
      adjustment: adj.value,
      factor: 'B2B',
      description: isHome ? 'Back-to-back (local)' : 'Back-to-back (visitante)'
    };
  }

  if (restDays >= 4) {
    return {
      adjustment: ADJUSTMENTS.FOUR_PLUS_REST.value,
      factor: 'REST_4+',
      description: `${restDays} días de descanso`
    };
  }

  return null;
}

/**
 * Detecta si es tercer juego en 4 noches
 * @param {Array<string>} recentGameDates - Fechas de últimos partidos (ISO strings)
 * @param {string} gameDate - Fecha del partido actual
 * @returns {{adjustment: number, factor: string, description: string} | null}
 */
export function calculateThreeInFourAdjustment(recentGameDates, gameDate) {
  if (!recentGameDates || recentGameDates.length < 2) return null;

  const current = new Date(gameDate);
  const fourDaysAgo = new Date(current);
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

  const gamesInWindow = recentGameDates.filter(date => {
    const d = new Date(date);
    return d >= fourDaysAgo && d < current;
  });

  if (gamesInWindow.length >= 2) {
    return {
      adjustment: ADJUSTMENTS.THREE_IN_FOUR.value,
      factor: '3_IN_4',
      description: '3er juego en 4 noches'
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// FACTORES DE VIAJE
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula ajuste por distancia de viaje
 * @param {number} travelMiles - Millas viajadas
 * @returns {{adjustment: number, factor: string, description: string} | null}
 */
export function calculateTravelAdjustment(travelMiles) {
  if (travelMiles > 2000) {
    return {
      adjustment: ADJUSTMENTS.TRAVEL_LONG.value,
      factor: 'TRAVEL_LONG',
      description: `Viaje largo (${Math.round(travelMiles)} mi)`
    };
  }
  return null;
}

/**
 * Calcula ajuste por cambio de zona horaria
 * @param {number} timezoneChange - Cambio en horas
 * @returns {{adjustment: number, factor: string, description: string} | null}
 */
export function calculateTimezoneAdjustment(timezoneChange) {
  if (Math.abs(timezoneChange) >= 2) {
    return {
      adjustment: ADJUSTMENTS.TRAVEL_TIMEZONE.value,
      factor: 'TIMEZONE',
      description: `Cambio de ${Math.abs(timezoneChange)}h zona horaria`
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// FACTORES DE ARENA
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula ajuste por altitud (Denver)
 * @param {string} arena - Ciudad/arena del partido
 * @param {boolean} isHome - Si el equipo es local
 * @returns {{adjustment: number, factor: string, description: string} | null}
 */
export function calculateAltitudeAdjustment(arena, isHome) {
  const isDenver = arena && arena.toLowerCase().includes('denver');
  
  if (isDenver) {
    if (isHome) {
      return {
        adjustment: ADJUSTMENTS.ALTITUDE_DENVER.value,
        factor: 'ALTITUDE_HOME',
        description: 'Ventaja de altitud (Denver)'
      };
    } else {
      return {
        adjustment: ADJUSTMENTS.ALTITUDE_DENVER_VISITOR.value,
        factor: 'ALTITUDE_AWAY',
        description: 'Fatiga por altitud (Denver)'
      };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// FACTORES DE LESIONES
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula ajuste por jugadores lesionados
 * @param {Array<{name: string, type: 'star' | 'starter' | 'rotation'}>} injuries
 * @returns {{adjustment: number, factor: string, description: string} | null}
 */
export function calculateInjuryAdjustment(injuries) {
  if (!injuries || injuries.length === 0) return null;

  let totalAdjustment = 0;
  const descriptions = [];

  for (const injury of injuries) {
    switch (injury.type) {
      case 'star':
        totalAdjustment += ADJUSTMENTS.STAR_OUT.value;
        descriptions.push(`${injury.name} (estrella)`);
        break;
      case 'starter':
        totalAdjustment += ADJUSTMENTS.STARTER_OUT.value;
        descriptions.push(`${injury.name} (titular)`);
        break;
      case 'rotation':
        totalAdjustment += ADJUSTMENTS.ROTATION_OUT.value;
        descriptions.push(`${injury.name} (rotación)`);
        break;
    }
  }

  if (totalAdjustment === 0) return null;

  return {
    adjustment: totalAdjustment,
    factor: 'INJURIES',
    description: `Lesiones: ${descriptions.join(', ')}`
  };
}

// ═══════════════════════════════════════════════════════════════
// FACTORES DE CONTEXTO
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula ajuste por contexto de temporada
 * @param {Object} context
 * @param {boolean} context.isPlayoffs
 * @param {boolean} context.isSeasonFinale
 * @param {boolean} context.isRivalry
 * @returns {Array<{adjustment: number, factor: string, description: string}>}
 */
export function calculateContextAdjustments(context = {}) {
  const adjustments = [];

  if (context.isPlayoffs) {
    adjustments.push({
      adjustment: ADJUSTMENTS.PLAYOFFS.value,
      factor: 'PLAYOFFS',
      description: 'Partido de playoffs'
    });
  }

  if (context.isSeasonFinale) {
    adjustments.push({
      adjustment: ADJUSTMENTS.SEASON_FINALE.value,
      factor: 'SEASON_END',
      description: 'Final de temporada'
    });
  }

  if (context.isRivalry) {
    adjustments.push({
      adjustment: ADJUSTMENTS.RIVALRY.value,
      factor: 'RIVALRY',
      description: 'Rivalidad histórica'
    });
  }

  return adjustments;
}

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════

/**
 * Calcula todos los ajustes contextuales para un partido
 * @param {Object} params
 * @param {Object} params.homeTeam - Info del equipo local
 * @param {Object} params.awayTeam - Info del equipo visitante
 * @param {Object} params.gameInfo - Info del partido
 * @returns {{totalAdjustment: number, factors: Array, breakdown: Object}}
 */
export function calculateAllAdjustments({
  homeTeam = {},
  awayTeam = {},
  gameInfo = {}
}) {
  const factors = [];

  // Descanso - Equipo local
  if (homeTeam.restDays !== undefined) {
    const restAdj = calculateRestAdjustment(homeTeam.restDays, true);
    if (restAdj) factors.push({ ...restAdj, team: 'home' });
  }

  // Descanso - Equipo visitante
  if (awayTeam.restDays !== undefined) {
    const restAdj = calculateRestAdjustment(awayTeam.restDays, false);
    if (restAdj) factors.push({ ...restAdj, team: 'away' });
  }

  // 3 en 4 noches - Local
  if (homeTeam.recentGames && gameInfo.date) {
    const adj = calculateThreeInFourAdjustment(homeTeam.recentGames, gameInfo.date);
    if (adj) factors.push({ ...adj, team: 'home' });
  }

  // 3 en 4 noches - Visitante
  if (awayTeam.recentGames && gameInfo.date) {
    const adj = calculateThreeInFourAdjustment(awayTeam.recentGames, gameInfo.date);
    if (adj) factors.push({ ...adj, team: 'away' });
  }

  // Viaje - Solo aplica al visitante
  if (awayTeam.travelMiles) {
    const adj = calculateTravelAdjustment(awayTeam.travelMiles);
    if (adj) factors.push({ ...adj, team: 'away' });
  }

  // Zona horaria - Solo visitante
  if (awayTeam.timezoneChange) {
    const adj = calculateTimezoneAdjustment(awayTeam.timezoneChange);
    if (adj) factors.push({ ...adj, team: 'away' });
  }

  // Altitud - Ambos equipos si juegan en Denver
  if (gameInfo.arena) {
    const homeAlt = calculateAltitudeAdjustment(gameInfo.arena, true);
    if (homeAlt) factors.push({ ...homeAlt, team: 'home' });

    const awayAlt = calculateAltitudeAdjustment(gameInfo.arena, false);
    if (awayAlt) factors.push({ ...awayAlt, team: 'away' });
  }

  // Lesiones - Local
  if (homeTeam.injuries) {
    const adj = calculateInjuryAdjustment(homeTeam.injuries);
    if (adj) factors.push({ ...adj, team: 'home' });
  }

  // Lesiones - Visitante
  if (awayTeam.injuries) {
    const adj = calculateInjuryAdjustment(awayTeam.injuries);
    if (adj) factors.push({ ...adj, team: 'away' });
  }

  // Contexto de temporada
  const contextAdj = calculateContextAdjustments(gameInfo.context);
  for (const adj of contextAdj) {
    factors.push({ ...adj, team: 'both' });
  }

  // Calcular total
  const totalAdjustment = factors.reduce((sum, f) => sum + f.adjustment, 0);

  // Ordenar por impacto absoluto (mayor primero)
  factors.sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment));

  return {
    totalAdjustment: Math.round(totalAdjustment * 10) / 10,
    factors,
    factorCount: factors.length,
    topFactors: factors.slice(0, 3) // Los 3 más importantes
  };
}

/**
 * Formatea los factores para mostrar al usuario
 * @param {Array} factors - Array de factores
 * @returns {string} Texto formateado
 */
export function formatFactorsForDisplay(factors) {
  if (!factors || factors.length === 0) {
    return 'Sin ajustes contextuales';
  }

  return factors
    .map(f => {
      const sign = f.adjustment > 0 ? '+' : '';
      return `${f.description} (${sign}${f.adjustment} pts)`;
    })
    .join(', ');
}