/**
 * @fileoverview Exports públicos de services
 */

// API Client
export {
  request,
  get,
  post,
  fetchNBAData,
  fetchGames,
  fetchTeamStats,
  fetchLocalStats,
  checkApiHealth,
  ApiError,
  isNetworkError,
  isRateLimitError
} from './api-client.js';

// Stats Service
export {
  getAllTeamStats,
  getTeamStats,
  getMatchupStats,
  getTodayGamesWithStats,
  extractPeriodStats,
  calculateAggregateStats,
  normalizeTeamName,
  calculateRestDays,
  isBackToBack,
  buildTeamContext,
  getServiceStatus,
  clearCache
} from './stats-service.js';