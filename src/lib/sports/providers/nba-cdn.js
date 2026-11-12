// NBA public data CDN (cdn.nba.com): season schedule, today's scoreboard and
// per-game box scores as static JSON, the same feed NBA.com reads. No key.
// Game and player ids are the official ones already used in nba_player_games,
// so rows from this adapter and from the owner's script are interchangeable.
// Shapes follow the public liveData documentation; `verified` stays false in
// the registry until a production run has been checked against NBA.com.
import { providerRequest } from '../core/http.js';

const BASE = 'https://cdn.nba.com/static/json';
const SEASON_TYPES = { '002': 'Regular Season', '004': 'Playoffs', '005': 'PlayIn' };
const HEADERS = { Accept: 'application/json', 'User-Agent': 'NioSportsPro/1.0 (+https://nio-sports-pro-v4-0.vercel.app)' };

export const seasonTypeOf = gameId => SEASON_TYPES[String(gameId).slice(0, 3)] || null;
export function seasonOf(gameId) {
  const yy = Number(String(gameId).slice(3, 5));
  return Number.isInteger(yy) ? `20${String(yy).padStart(2, '0')}-${String((yy + 1) % 100).padStart(2, '0')}` : null;
}

/** "PT34M12.00S" → 34.2 minutes (2 decimals); anything else → 0. */
export function minutesOf(iso) {
  const m = /^PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(String(iso || ''));
  if (!m) return 0;
  return Math.round(((Number(m[1] || 0) * 60 + Number(m[2] || 0)) / 60) * 100) / 100;
}

const dateOf = g => {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(String(g?.gameDateEst || g?.gameEt || ''));
  if (iso) return iso[1];
  const us = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(g?.gameDate || ''));
  return us ? `${us[3]}-${us[1]}-${us[2]}` : null;
};

/** Compact schedule: [{ id, day }] for countable games (regular season, play-in, playoffs). */
export function normaliseSchedule(body) {
  const out = [];
  for (const d of body?.leagueSchedule?.gameDates || []) {
    for (const g of d.games || []) {
      const id = String(g.gameId || '');
      const day = dateOf(g) || dateOf(d);
      if (/^\d{10}$/.test(id) && seasonTypeOf(id) && day) out.push({ id, day });
    }
  }
  return out;
}

export function normaliseScoreboard(body) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(body?.scoreboard?.gameDate || '') ? body.scoreboard.gameDate : null;
  return (body?.scoreboard?.games || []).map(g => ({ id: String(g.gameId || ''), day: dateOf(g) || day, final: g.gameStatus === 3 }))
    .filter(g => /^\d{10}$/.test(g.id) && seasonTypeOf(g.id) && g.day);
}

const int = v => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

/**
 * One finished game → rows in the nba_player_games shape (players who took the
 * court only, as in the official game log). Returns { final:false } while the
 * game is not over, so a partial box score is never stored.
 */
export function normaliseBoxScore(body, fallbackDay = null) {
  const game = body?.game;
  const id = String(game?.gameId || '');
  if (!game || !/^\d{10}$/.test(id)) return { final: false, rows: [], reason: 'bad_payload' };
  if (game.gameStatus !== 3) return { final: false, rows: [], reason: 'not_final' };
  const day = dateOf(game) || fallbackDay;
  const home = game.homeTeam, away = game.awayTeam;
  const rows = [];
  for (const [team, opp, isHome] of [[home, away, true], [away, home, false]]) {
    for (const p of team?.players || []) {
      const s = p.statistics || {};
      const minutes = minutesOf(s.minutes ?? s.minutesCalculated);
      if (!(p.played === '1' || p.played === 1 || p.played === true || minutes > 0)) continue;
      rows.push({
        game_id: id, player_id: int(p.personId), season: seasonOf(id), season_type: seasonTypeOf(id), game_date: day,
        player_name: String(p.name || `${p.firstName || ''} ${p.familyName || ''}`).trim(), team: team.teamTricode, opponent: opp?.teamTricode,
        is_home: isHome, won: Number.isFinite(team.score) && Number.isFinite(opp?.score) ? team.score > opp.score : null, minutes,
        pts: int(s.points), reb: int(s.reboundsTotal), ast: int(s.assists), fg3m: int(s.threePointersMade), fg3a: int(s.threePointersAttempted),
        fgm: int(s.fieldGoalsMade), fga: int(s.fieldGoalsAttempted), ftm: int(s.freeThrowsMade), fta: int(s.freeThrowsAttempted),
        oreb: int(s.reboundsOffensive), dreb: int(s.reboundsDefensive), stl: int(s.steals), blk: int(s.blocks), tov: int(s.turnovers),
        pf: int(s.foulsPersonal), plus_minus: int(s.plusMinusPoints)
      });
    }
  }
  return { final: true, rows, day, score: { home: home?.score ?? null, away: away?.score ?? null } };
}

export const nbaCdn = {
  id: 'nba-cdn', sport: ['nba'], kinds: ['boxscores'], tier: 'free_public', env: [], verified: false,
  docs: 'https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gameId}.json (datos públicos de NBA.com; revisar términos antes de uso comercial)',
  limits: { capacity: 60, perMs: 60000 },
  async schedule({ fetchImpl, log, limiter } = {}) {
    const { body } = await providerRequest(`${BASE}/staticData/scheduleLeagueV2.json`, { provider: 'nba-cdn', headers: HEADERS, fetchImpl, log, limiter, timeoutMs: 20000, retries: 1 });
    return normaliseSchedule(body);
  },
  async scoreboard({ fetchImpl, log, limiter } = {}) {
    const { body } = await providerRequest(`${BASE}/liveData/scoreboard/todaysScoreboard_00.json`, { provider: 'nba-cdn', headers: HEADERS, fetchImpl, log, limiter, retries: 1 });
    return normaliseScoreboard(body);
  },
  async boxScore(gameId, { fetchImpl, log, limiter, day = null } = {}) {
    const { body } = await providerRequest(`${BASE}/liveData/boxscore/boxscore_${encodeURIComponent(gameId)}.json`, { provider: 'nba-cdn', headers: HEADERS, fetchImpl, log, limiter, retries: 1 });
    return normaliseBoxScore(body, day);
  }
};
