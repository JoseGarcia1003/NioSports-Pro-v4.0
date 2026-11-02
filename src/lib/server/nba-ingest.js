import { timingSafeEqual } from 'node:crypto';

// Validation for player box scores sent by the owner's ingestion script.
// Rows are rejected whole: a partially valid row never reaches the database.
export const MAX_ROWS = 2000;
const INT_LIMITS = { pts: 120, reb: 60, ast: 40, fg3m: 30, fg3a: 50, fgm: 50, fga: 80, ftm: 40, fta: 50, oreb: 30, dreb: 40, stl: 20, blk: 20, tov: 25, pf: 6 };
const SEASON_TYPES = new Set(['Regular Season', 'Playoffs', 'PlayIn']);
const TEAM = /^[A-Z]{3}$/;

export function authorized(header, secret) {
  if (!secret || secret.length < 24 || typeof header !== 'string') return false;
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function int(v, max, min = 0) {
  return Number.isInteger(v) && v >= min && v <= max;
}

export function validateRow(r) {
  const errors = [];
  if (!r || typeof r !== 'object') return ['row is not an object'];
  if (typeof r.game_id !== 'string' || !/^[0-9]{10}$/.test(r.game_id)) errors.push('game_id');
  if (!int(r.player_id, 2_000_000_000, 1)) errors.push('player_id');
  if (typeof r.season !== 'string' || !/^[0-9]{4}-[0-9]{2}$/.test(r.season)) errors.push('season');
  if (!SEASON_TYPES.has(r.season_type)) errors.push('season_type');
  if (typeof r.game_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.game_date) || Number.isNaN(Date.parse(r.game_date))) errors.push('game_date');
  if (typeof r.player_name !== 'string' || !r.player_name.trim() || r.player_name.length > 80) errors.push('player_name');
  if (!TEAM.test(r.team ?? '')) errors.push('team');
  if (!TEAM.test(r.opponent ?? '') || r.opponent === r.team) errors.push('opponent');
  if (typeof r.is_home !== 'boolean') errors.push('is_home');
  if (r.won != null && typeof r.won !== 'boolean') errors.push('won');
  if (typeof r.minutes !== 'number' || !Number.isFinite(r.minutes) || r.minutes < 0 || r.minutes > 80) errors.push('minutes');
  for (const [k, max] of Object.entries(INT_LIMITS)) if (!int(r[k], max)) errors.push(k);
  if (r.plus_minus != null && !int(r.plus_minus, 90, -90)) errors.push('plus_minus');
  if (!errors.length) {
    if (r.fg3m > r.fg3a || r.fgm > r.fga || r.ftm > r.fta || r.fg3m > r.fgm) errors.push('makes exceed attempts');
    if (r.oreb + r.dreb !== r.reb) errors.push('reb != oreb + dreb');
    if (r.pts !== 2 * r.fgm + r.fg3m + r.ftm) errors.push('pts inconsistent with makes');
  }
  return errors;
}

const COLUMNS = ['game_id', 'player_id', 'season', 'season_type', 'game_date', 'player_name', 'team', 'opponent', 'is_home', 'won', 'minutes', ...Object.keys(INT_LIMITS), 'plus_minus'];

export function parseBatch(body) {
  if (!body || !Array.isArray(body.rows)) return { error: 'rows must be an array' };
  if (!body.rows.length || body.rows.length > MAX_ROWS) return { error: `rows must contain 1-${MAX_ROWS} items` };
  const invalid = [];
  const keys = new Set();
  const rows = [];
  body.rows.forEach((r, i) => {
    const errors = validateRow(r);
    const key = `${r?.game_id}:${r?.player_id}`;
    if (!errors.length && keys.has(key)) errors.push('duplicate in batch');
    if (errors.length) { if (invalid.length < 20) invalid.push({ index: i, errors }); return; }
    keys.add(key);
    rows.push(Object.fromEntries(COLUMNS.map(c => [c, r[c] ?? null])));
  });
  return invalid.length ? { error: 'invalid rows', invalid } : { rows };
}

// ── Player positions (stats.nba.com PlayerIndex) ─────────────────────────────
export const MAX_PLAYERS = 1000;
const POSITION = /^[GFC](-[GFC])?$/;

/** Validates { season, players: [{ player_id, player_name, team?, position }] }. */
export function parsePlayers(body) {
  if (!body || typeof body.season !== 'string' || !/^[0-9]{4}-[0-9]{2}$/.test(body.season)) return { error: 'season' };
  if (!Array.isArray(body.players) || !body.players.length || body.players.length > MAX_PLAYERS) return { error: `players must contain 1-${MAX_PLAYERS} items` };
  const invalid = [], rows = [], seen = new Set();
  body.players.forEach((p, i) => {
    const errors = [];
    if (!p || typeof p !== 'object') errors.push('not an object');
    else {
      if (!int(p.player_id, 2_000_000_000, 1)) errors.push('player_id');
      if (typeof p.player_name !== 'string' || !p.player_name.trim() || p.player_name.length > 80) errors.push('player_name');
      if (p.team != null && !TEAM.test(p.team)) errors.push('team');
      if (typeof p.position !== 'string' || !POSITION.test(p.position)) errors.push('position');
      if (!errors.length && seen.has(p.player_id)) errors.push('duplicate in batch');
    }
    if (errors.length) { if (invalid.length < 20) invalid.push({ index: i, errors }); return; }
    seen.add(p.player_id);
    rows.push({ player_id: p.player_id, player_name: p.player_name.trim(), team: p.team ?? null, position: p.position, season: body.season });
  });
  if (invalid.length) return { error: 'invalid players', invalid };
  return { rows };
}
