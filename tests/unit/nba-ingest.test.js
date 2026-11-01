import { describe, it, expect, vi, afterEach } from 'vitest';
import { env } from '$env/dynamic/private';

const upsert = vi.fn(async () => ({ error: null }));
vi.mock('$lib/server/entitlements.js', () => ({ adminDatabase: () => ({ from: () => ({ upsert }) }) }));

const { authorized, validateRow, parseBatch, MAX_ROWS } = await import('../../src/lib/server/nba-ingest.js');
const { POST } = await import('../../src/routes/api/ingest/nba-player-games/+server.js');

const SECRET = 'x'.repeat(40);
const row = (over = {}) => ({ game_id: '0022600045', player_id: 1629639, season: '2026-27', season_type: 'Regular Season', game_date: '2026-10-30', player_name: 'Tyler Herro', team: 'MIL', opponent: 'HOU', is_home: true, won: true, minutes: 34.5, pts: 24, reb: 6, ast: 4, fg3m: 3, fg3a: 8, fgm: 9, fga: 18, ftm: 3, fta: 4, oreb: 1, dreb: 5, stl: 1, blk: 0, tov: 2, pf: 3, plus_minus: 7, ...over });
const request = (body, auth = `Bearer ${SECRET}`) => ({ request: new Request('http://x/api/ingest/nba-player-games', { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body) }) });

afterEach(() => { env.INGEST_SECRET = undefined; upsert.mockClear(); });

describe('player box score ingestion', () => {
  it('accepts a consistent box score', () => {
    expect(validateRow(row())).toEqual([]);
  });

  it('rejects points that do not match the made shots', () => {
    expect(validateRow(row({ pts: 30 }))).toContain('pts inconsistent with makes');
  });

  it('rejects impossible shooting and rebound splits', () => {
    expect(validateRow(row({ fg3m: 31 }))).toContain('fg3m');
    expect(validateRow(row({ fg3m: 9 }))).toContain('makes exceed attempts');
    expect(validateRow(row({ fg3m: 4, fg3a: 3, pts: 25 }))).toContain('makes exceed attempts');
    expect(validateRow(row({ oreb: 2 }))).toContain('reb != oreb + dreb');
  });

  it('rejects malformed identifiers and teams playing themselves', () => {
    const errors = validateRow(row({ game_id: '45', opponent: 'MIL', season_type: 'Preseason' }));
    expect(errors).toEqual(expect.arrayContaining(['game_id', 'opponent', 'season_type']));
  });

  it('rejects a whole batch with duplicates or oversize', () => {
    expect(parseBatch({ rows: [row(), row()] }).error).toBe('invalid rows');
    expect(parseBatch({ rows: Array(MAX_ROWS + 1).fill(row()) }).error).toMatch(/rows must contain/);
  });

  it('requires a long secret compared in constant time', () => {
    expect(authorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(authorized('Bearer short', 'short')).toBe(false);
    expect(authorized(`Bearer ${'y'.repeat(40)}`, SECRET)).toBe(false);
    expect(authorized(null, SECRET)).toBe(false);
  });

  it('returns 401 without the secret and never touches the database', async () => {
    env.INGEST_SECRET = SECRET;
    const res = await POST(request({ rows: [row()] }, 'Bearer wrong'));
    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('stores a valid batch idempotently by game and player', async () => {
    env.INGEST_SECRET = SECRET;
    const res = await POST(request({ rows: [row(), row({ player_id: 2 })] }));
    expect(res.status).toBe(200);
    expect((await res.json()).stored).toBe(2);
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'game_id,player_id' });
  });

  it('returns 422 with row-level reasons for invalid data', async () => {
    env.INGEST_SECRET = SECRET;
    const res = await POST(request({ rows: [row({ pts: 99 })] }));
    expect(res.status).toBe(422);
    expect((await res.json()).invalid[0].errors).toContain('pts inconsistent with makes');
    expect(upsert).not.toHaveBeenCalled();
  });
});
