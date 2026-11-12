// @vitest-environment node
import { it, expect, describe } from 'vitest';
import { minutesOf, seasonOf, seasonTypeOf, normaliseSchedule, normaliseScoreboard, normaliseBoxScore } from '../../src/lib/sports/providers/nba-cdn.js';
import { syncNbaBoxScores, missingGames } from '../../src/lib/server/nba-boxscore-sync.js';
import { validateRow } from '../../src/lib/server/nba-ingest.js';

const player = (id, name, o = {}) => ({ personId: id, name, played: '1', statistics: { minutes: 'PT30M30.00S', points: 12, reboundsTotal: 5, reboundsOffensive: 1, reboundsDefensive: 4, assists: 3,
  steals: 1, blocks: 0, turnovers: 2, foulsPersonal: 3, fieldGoalsMade: 4, fieldGoalsAttempted: 9, threePointersMade: 2, threePointersAttempted: 5, freeThrowsMade: 2, freeThrowsAttempted: 2, plusMinusPoints: -4.0, ...o.statistics }, ...o.top });
const roster = (base, n = 6) => Array.from({ length: n }, (_, i) => player(base + i, `Jugador ${base + i}`));
const box = (id, o = {}) => ({ game: { gameId: id, gameStatus: 3, gameEt: '2026-11-05T19:30:00-05:00',
  homeTeam: { teamTricode: 'BOS', score: 110, players: [...roster(100), player(199, 'Sin Jugar', { top: { played: '0' }, statistics: { minutes: 'PT00M00.00S', points: 0, reboundsTotal: 0, reboundsOffensive: 0, reboundsDefensive: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, foulsPersonal: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0, plusMinusPoints: 0 } })] },
  awayTeam: { teamTricode: 'ORL', score: 101, players: roster(200) }, ...o } });

describe('NBA CDN normalisation', () => {
  it('parses durations, seasons and countable game types', () => {
    expect(minutesOf('PT34M12.00S')).toBe(34.2); expect(minutesOf('PT00M20.00S')).toBe(0.33); expect(minutesOf('')).toBe(0); expect(minutesOf('34:12')).toBe(0);
    expect(seasonOf('0022600149')).toBe('2026-27'); expect(seasonOf('0049900001')).toBe('2099-00');
    expect(seasonTypeOf('0022600149')).toBe('Regular Season'); expect(seasonTypeOf('0042600101')).toBe('Playoffs'); expect(seasonTypeOf('0052600001')).toBe('PlayIn');
    expect(seasonTypeOf('0012600001')).toBeNull(); expect(seasonTypeOf('0032600001')).toBeNull();
  });
  it('keeps only countable games from the schedule and scoreboard', () => {
    const s = normaliseSchedule({ leagueSchedule: { gameDates: [{ gameDate: '11/05/2026 00:00:00', games: [{ gameId: '0022600160', gameDateEst: '2026-11-05T00:00:00Z' }, { gameId: '0012600009' }, { gameId: 'x' }, { gameId: '0022600161' }] }] } });
    expect(s).toEqual([{ id: '0022600160', day: '2026-11-05' }, { id: '0022600161', day: '2026-11-05' }]);
    expect(normaliseScoreboard({ scoreboard: { gameDate: '2026-11-05', games: [{ gameId: '0022600160', gameStatus: 3 }, { gameId: '0022600161', gameStatus: 2 }] } })).toEqual([{ id: '0022600160', day: '2026-11-05', final: true }, { id: '0022600161', day: '2026-11-05', final: false }]);
    expect(normaliseSchedule(null)).toEqual([]);
  });
  it('turns a finished game into rows that pass the ingest validation', () => {
    const r = normaliseBoxScore(box('0022600160'));
    expect(r.final).toBe(true); expect(r.rows).toHaveLength(12);
    expect(r.rows.every(x => validateRow(x).length === 0)).toBe(true);
    expect(r.rows[0]).toMatchObject({ game_id: '0022600160', season: '2026-27', season_type: 'Regular Season', game_date: '2026-11-05', team: 'BOS', opponent: 'ORL', is_home: true, won: true, minutes: 30.5, pts: 12, reb: 5, plus_minus: -4 });
    expect(r.rows[6]).toMatchObject({ team: 'ORL', opponent: 'BOS', is_home: false, won: false });
    expect(r.rows.some(x => x.player_name === 'Sin Jugar')).toBe(false);
  });
  it('never stores an unfinished or malformed game', () => {
    expect(normaliseBoxScore(box('0022600160', { gameStatus: 2 }))).toMatchObject({ final: false, reason: 'not_final' });
    expect(normaliseBoxScore({})).toMatchObject({ final: false, reason: 'bad_payload' });
  });
});

function fakeDb({ last = '2026-11-03', stored = [] } = {}) {
  const state = { upserts: [], runs: [] };
  const db = { state,
    rpc: async name => (name === 'nba_stored_games' ? { data: stored, error: null } : { data: null, error: null }),
    from: table => table === 'ingest_runs' ? { insert: async r => { state.runs.push(r); return { error: null }; } } : {
      select: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: last ? { game_date: last } : null, error: null }) }) }) }),
      upsert: async (rows, opt) => { state.upserts.push({ rows, opt }); return { error: null }; } } };
  return db;
}
const provider = (over = {}) => ({ id: 'nba-cdn', limits: { capacity: 100, perMs: 1000 },
  schedule: async () => [{ id: '0022600150', day: '2026-11-02' }, { id: '0022600160', day: '2026-11-05' }, { id: '0022600161', day: '2026-11-05' }, { id: '0022600170', day: '2026-11-06' }, { id: '0022600199', day: '2026-11-20' }],
  scoreboard: async () => [], boxScore: async id => normaliseBoxScore(box(id)), ...over });

describe('box score sync', () => {
  it('selects only missing games inside the window, oldest first', () => {
    const todo = missingGames([{ id: 'b', day: '2026-11-05' }, { id: 'a', day: '2026-11-04' }, { id: 'c', day: '2026-11-09' }, { id: 'd', day: '2026-11-05' }], new Map([['d', 24], ['b', 3]]), { from: '2026-11-04', to: '2026-11-06' });
    expect(todo.map(g => g.id)).toEqual(['a', 'b']);
  });
  it('stores whole finished games, skips stored and future ones, and records the run', async () => {
    const db = fakeDb({ stored: [{ game_id: '0022600161', n: 24 }] });
    const r = await syncNbaBoxScores(db, { today: '2026-11-06', provider: provider({ boxScore: async id => (id === '0022600170' ? { final: false, rows: [] } : normaliseBoxScore(box(id))) }) });
    expect(r).toMatchObject({ status: 'ok', records_valid: 24, data_as_of: '2026-11-05' });
    // Window starts one day before the last stored day (11-03): 11-02 is re-checked, 11-20 is in the future.
    expect(db.state.upserts.map(u => u.rows[0].game_id)).toEqual(['0022600150', '0022600160']);
    expect(db.state.upserts[0].opt).toEqual({ onConflict: 'game_id,player_id' });
    expect(db.state.runs[0]).toMatchObject({ sport: 'nba', kind: 'boxscores', provider: 'nba-cdn', status: 'ok' });
    expect(db.state.runs[0].details).toMatchObject({ gamesStored: 2, notFinal: 1, candidates: 3 });
  });
  it('rejects a whole game when any row breaks the integrity rules', async () => {
    const db = fakeDb();
    const bad = id => { const b = box(id); b.game.homeTeam.players[0].statistics.points = 99; return normaliseBoxScore(b); };
    const r = await syncNbaBoxScores(db, { today: '2026-11-05', provider: provider({ boxScore: async id => (id === '0022600160' ? bad(id) : normaliseBoxScore(box(id))) }) });
    expect(r.status).toBe('partial'); expect(r.records_rejected).toBe(12);
    expect(db.state.upserts.map(u => u.rows[0].game_id)).toEqual(['0022600150', '0022600161']);
    expect(db.state.runs[0].details.rejected[0].id).toBe('0022600160');
  });
  it('falls back to the scoreboard and reports provider failure honestly', async () => {
    const db = fakeDb();
    const viaBoard = await syncNbaBoxScores(db, { today: '2026-11-05', provider: provider({ schedule: async () => { throw Object.assign(new Error('x'), { code: 'timeout' }); }, scoreboard: async () => [{ id: '0022600160', day: '2026-11-05', final: true }] }) });
    expect(viaBoard.details.sources).toEqual(['schedule_failed:timeout', 'scoreboard']); expect(viaBoard.records_valid).toBe(12);
    const db2 = fakeDb();
    const down = await syncNbaBoxScores(db2, { today: '2026-11-05', provider: provider({ schedule: async () => { throw Object.assign(new Error('x'), { code: 'http_error' }); }, scoreboard: async () => { throw Object.assign(new Error('x'), { code: 'http_error' }); } }) });
    expect(down).toMatchObject({ status: 'failed', error_code: 'http_error' }); expect(db2.state.upserts).toHaveLength(0);
  });
  it('stops when the time budget is spent and resumes next run', async () => {
    const db = fakeDb(); let t = 0;
    await syncNbaBoxScores(db, { today: '2026-11-06', budgetMs: 10, now: () => (t += 8), provider: provider({ boxScore: async id => normaliseBoxScore(box(id)) }) });
    expect(db.state.upserts.length).toBeLessThan(3);
  });
});
