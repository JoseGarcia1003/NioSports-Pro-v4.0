// @vitest-environment node
import { it, expect, describe } from 'vitest';
import { syncNbaBoxScores, missingGames } from '../../src/lib/server/nba-boxscore-sync.js';

// A provider is injected (none is wired in production yet): these fixtures stand in for one.
const row = (gameId, playerId, team, opp, isHome, o = {}) => ({ game_id: gameId, player_id: playerId, season: '2026-27', season_type: 'Regular Season', game_date: '2026-11-05', player_name: `Jugador ${playerId}`,
  team, opponent: opp, is_home: isHome, won: isHome, minutes: 30.5, pts: 12, reb: 5, ast: 3, fg3m: 2, fg3a: 5, fgm: 4, fga: 9, ftm: 2, fta: 2, oreb: 1, dreb: 4, stl: 1, blk: 0, tov: 2, pf: 3, plus_minus: -4, ...o });
const box = id => ({ final: true, day: '2026-11-05', rows: [...Array.from({ length: 6 }, (_, i) => row(id, 100 + i, 'BOS', 'ORL', true)), ...Array.from({ length: 6 }, (_, i) => row(id, 200 + i, 'ORL', 'BOS', false))] });
const normaliseBoxScore = b => b;

function fakeDb({ last = '2026-11-03', stored = [] } = {}) {
  const state = { upserts: [], runs: [] };
  const db = { state,
    rpc: async name => (name === 'nba_stored_games' ? { data: stored, error: null } : { data: null, error: null }),
    from: table => table === 'ingest_runs' ? { insert: async r => { state.runs.push(r); return { error: null }; } } : {
      select: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: last ? { game_date: last } : null, error: null }) }) }) }),
      upsert: async (rows, opt) => { state.upserts.push({ rows, opt }); return { error: null }; } } };
  return db;
}
const provider = (over = {}) => ({ id: 'licensed-feed', limits: { capacity: 100, perMs: 1000 },
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
    expect(db.state.runs[0]).toMatchObject({ sport: 'nba', kind: 'boxscores', provider: 'licensed-feed', status: 'ok' });
    expect(db.state.runs[0].details).toMatchObject({ gamesStored: 2, notFinal: 1, candidates: 3 });
  });
  it('rejects a whole game when any row breaks the integrity rules', async () => {
    const db = fakeDb();
    const bad = id => { const b = box(id); b.rows[0] = { ...b.rows[0], pts: 99 }; return b; };
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
  it('refuses to run without an injected provider', async () => {
    await expect(syncNbaBoxScores(fakeDb(), { today: '2026-11-06' })).rejects.toThrow('provider required');
  });
  it('stops when the time budget is spent and resumes next run', async () => {
    const db = fakeDb(); let t = 0;
    await syncNbaBoxScores(db, { today: '2026-11-06', budgetMs: 10, now: () => (t += 8), provider: provider({ boxScore: async id => normaliseBoxScore(box(id)) }) });
    expect(db.state.upserts.length).toBeLessThan(3);
  });
});
