// Per-sport configuration: markets, providers per data kind, freshness policy,
// sealing ledger key. Adding a provider = write an adapter in providers/ and
// list its id here; no sport module or page has to change.
export const DATA_KINDS = Object.freeze(['schedule', 'results', 'boxscores', 'odds', 'injuries', 'lineups']);

export const SPORTS_CONFIG = Object.freeze({
  nba: {
    id: 'nba', name: 'Baloncesto (NBA)', timezone: 'America/New_York',
    markets: ['points', 'rebounds', 'assists', 'pra', 'team_points', 'game_total'],
    modelled: { points: 'nba-points@1.0.0' },
    providers: { schedule: ['balldontlie'], results: ['balldontlie'], boxscores: ['nba-cdn', 'nba-stats-ingest'], odds: ['the-odds-api'], injuries: [], lineups: [] },
    freshness: { boxScores: { maxAgeDays: 3 }, odds: { maxAgeHours: 8 }, schedule: { maxAgeHours: 12 } }
  },
  football: {
    id: 'football', name: 'Fútbol', timezone: 'America/Guayaquil',
    markets: ['match_result', 'total_goals', 'both_teams_score'],
    modelled: {},
    providers: { schedule: ['football-data', 'api-football'], results: ['football-data', 'api-football'], boxscores: ['api-football'], odds: ['the-odds-api'], injuries: ['api-football'], lineups: ['api-football'] },
    freshness: { boxScores: { maxAgeDays: 8 }, odds: { maxAgeHours: 8 }, schedule: { maxAgeHours: 12 } }
  },
  tennis: {
    id: 'tennis', name: 'Tenis', timezone: 'UTC',
    markets: ['match_winner', 'total_games'],
    modelled: {},
    providers: { schedule: ['tennis-feed'], results: ['tennis-feed'], boxscores: [], odds: [], injuries: [], lineups: [] },
    freshness: { boxScores: { maxAgeDays: 14 }, odds: { maxAgeHours: 6 }, schedule: { maxAgeHours: 12 } }
  },
  mlb: {
    id: 'mlb', name: 'Béisbol (MLB)', timezone: 'America/New_York',
    markets: ['moneyline', 'run_total', 'pitcher_strikeouts'],
    modelled: {},
    providers: { schedule: ['mlb-statsapi'], results: ['mlb-statsapi'], boxscores: ['mlb-statsapi'], odds: ['the-odds-api'], injuries: [], lineups: [] },
    freshness: { boxScores: { maxAgeDays: 3 }, odds: { maxAgeHours: 8 }, schedule: { maxAgeHours: 12 } }
  }
});

export const SPORT_IDS = Object.freeze(Object.keys(SPORTS_CONFIG));
