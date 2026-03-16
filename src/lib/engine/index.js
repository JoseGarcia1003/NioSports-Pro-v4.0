/**
 * @fileoverview NioSports Pro - Motor Predictivo v2.0
 * Punto de entrada público del engine
 */

// Función principal
export { 
  predict, 
  predictAllPeriods, 
  quickPredict,
  calculateBaseProjection,
  calculateWeightedAverage,
  calibrateProjection,
  MODEL_VERSION 
} from './predictor.js';

// Probabilidades
export { 
  normalCDF,
  calculateZScore,
  calculateOverProbability,
  calculateUnderProbability,
  getRecommendation,
  calculateEV,
  calculateEdge,
  analyzePlay,
  oddsToDecimal,
  oddsToImpliedProbability
} from './probability.js';

// Factores contextuales
export { 
  calculateAllAdjustments,
  calculateRestAdjustment,
  calculateInjuryAdjustment,
  calculateAltitudeAdjustment,
  calculateTravelAdjustment,
  calculateContextAdjustments,
  formatFactorsForDisplay
} from './factors.js';

// Constantes
export { 
  STD_DEV,
  ADJUSTMENTS,
  RECENCY_WEIGHTS,
  CALIBRATION,
  CONFIDENCE_THRESHOLDS,
  PERIODS,
  BETTING
} from './constants.js';

// Team Mapping
export {
  TEAM_NAME_MAP,
  TEAM_NAME_REVERSE,
  toShortName,
  toFullName,
  isValidTeam,
  getAllShortNames,
  getAllFullNames
} from './team-mapping.js';