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

// CLV Tracker Service
export {
  configure as configureCLV,
  isReady as isCLVReady,
  getCurrentLines,
  getClosingLine,
  calculateCLV,
  interpretCLV,
  recordLineAtPick,
  scheduleClosingLineCheck
} from './clv-tracker.js';

export { default as clvTracker } from './clv-tracker.js';

// Export Service
export {
  calculateStats,
  exportToCSV,
  exportToJSON,
  generatePerformanceReport
} from './export-service.js';

export { default as exportService } from './export-service.js';