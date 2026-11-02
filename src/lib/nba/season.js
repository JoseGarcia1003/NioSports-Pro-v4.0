// Season statistics and standings computed from official box scores
// (stats.nba.com via the owner's ingestion). Pure functions only.

/** Current NBA alignment: conference (E/W), division and full name. */
export const TEAMS = {
  BOS: ['E', 'Atlántico', 'Boston Celtics'], BKN: ['E', 'Atlántico', 'Brooklyn Nets'], NYK: ['E', 'Atlántico', 'New York Knicks'],
  PHI: ['E', 'Atlántico', 'Philadelphia 76ers'], TOR: ['E', 'Atlántico', 'Toronto Raptors'],
  CHI: ['E', 'Central', 'Chicago Bulls'], CLE: ['E', 'Central', 'Cleveland Cavaliers'], DET: ['E', 'Central', 'Detroit Pistons'],
  IND: ['E', 'Central', 'Indiana Pacers'], MIL: ['E', 'Central', 'Milwaukee Bucks'],
  ATL: ['E', 'Sureste', 'Atlanta Hawks'], CHA: ['E', 'Sureste', 'Charlotte Hornets'], MIA: ['E', 'Sureste', 'Miami Heat'],
  ORL: ['E', 'Sureste', 'Orlando Magic'], WAS: ['E', 'Sureste', 'Washington Wizards'],
  DEN: ['W', 'Noroeste', 'Denver Nuggets'], MIN: ['W', 'Noroeste', 'Minnesota Timberwolves'], OKC: ['W', 'Noroeste', 'Oklahoma City Thunder'],
  POR: ['W', 'Noroeste', 'Portland Trail Blazers'], UTA: ['W', 'Noroeste', 'Utah Jazz'],
  GSW: ['W', 'Pacífico', 'Golden State Warriors'], LAC: ['W', 'Pacífico', 'LA Clippers'], LAL: ['W', 'Pacífico', 'Los Angeles Lakers'],
  PHX: ['W', 'Pacífico', 'Phoenix Suns'], SAC: ['W', 'Pacífico', 'Sacramento Kings'],
  DAL: ['W', 'Suroeste', 'Dallas Mavericks'], HOU: ['W', 'Suroeste', 'Houston Rockets'], MEM: ['W', 'Suroeste', 'Memphis Grizzlies'],
  NOP: ['W', 'Suroeste', 'New Orleans Pelicans'], SAS: ['W', 'Suroeste', 'San Antonio Spurs']
};

/** NBA season label for a date: the season starts in October. */
export function seasonFor(now = Date.now()) {
  const d = new Date(now);
  const start = d.getUTCMonth() >= 9 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
export function previousSeason(season) {
  const start = Number(season.slice(0, 4)) - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

const per = (v, gp) => (gp ? v / gp : null);
const pct = (made, att) => (att ? (made / att) * 100 : null);

/** Season sums per player → per-game row (percentages from totals, like the NBA). */
export function playerRow(s) {
  const gp = Number(s.gp) || 0;
  const n = k => Number(s[k]) || 0;
  return {
    id: s.player_id, name: s.player_name, team: s.team, gp, w: n('w'), l: n('l'),
    min: per(n('min'), gp), pts: per(n('pts'), gp), fgm: per(n('fgm'), gp), fga: per(n('fga'), gp), fgPct: pct(n('fgm'), n('fga')),
    fg3m: per(n('fg3m'), gp), fg3a: per(n('fg3a'), gp), fg3Pct: pct(n('fg3m'), n('fg3a')),
    ftm: per(n('ftm'), gp), fta: per(n('fta'), gp), ftPct: pct(n('ftm'), n('fta')),
    oreb: per(n('oreb'), gp), dreb: per(n('dreb'), gp), reb: per(n('reb'), gp), ast: per(n('ast'), gp),
    tov: per(n('tov'), gp), stl: per(n('stl'), gp), blk: per(n('blk'), gp), pf: per(n('pf'), gp), pm: per(n('plus_minus'), gp)
  };
}

/** Team-game rows → per-game team statistics. */
export function teamRows(games) {
  const by = new Map();
  for (const g of games || []) {
    const t = by.get(g.team) || { team: g.team, gp: 0, w: 0, l: 0, sums: {} };
    t.gp++;
    if (g.pts > g.opp_pts) t.w++; else if (g.pts < g.opp_pts) t.l++;
    for (const k of ['pts', 'opp_pts', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta', 'oreb', 'dreb', 'reb', 'ast', 'tov', 'stl', 'blk', 'pf']) t.sums[k] = (t.sums[k] || 0) + (Number(g[k]) || 0);
    by.set(g.team, t);
  }
  return [...by.values()].map(({ team, gp, w, l, sums: s }) => ({
    team, name: TEAMS[team]?.[2] ?? team, gp, w, l, winPct: gp ? w / gp : null,
    pts: per(s.pts, gp), oppPts: per(s.opp_pts, gp), diff: per(s.pts - s.opp_pts, gp),
    fgm: per(s.fgm, gp), fga: per(s.fga, gp), fgPct: pct(s.fgm, s.fga), fg3m: per(s.fg3m, gp), fg3a: per(s.fg3a, gp), fg3Pct: pct(s.fg3m, s.fg3a),
    ftm: per(s.ftm, gp), fta: per(s.fta, gp), ftPct: pct(s.ftm, s.fta), oreb: per(s.oreb, gp), dreb: per(s.dreb, gp), reb: per(s.reb, gp),
    ast: per(s.ast, gp), tov: per(s.tov, gp), stl: per(s.stl, gp), blk: per(s.blk, gp), pf: per(s.pf, gp)
  }));
}

const record = list => `${list.filter(g => g.pts > g.opp_pts).length}-${list.filter(g => g.pts < g.opp_pts).length}`;

/**
 * Standings per conference. Order: win %, then wins, then point differential
 * (a simplified tiebreak; the NBA's official tiebreakers are more complex).
 */
export function standings(games) {
  const byTeam = new Map();
  for (const g of games || []) (byTeam.get(g.team) || byTeam.set(g.team, []).get(g.team)).push(g);
  const rows = [...byTeam.entries()].filter(([t]) => TEAMS[t]).map(([team, list]) => {
    const sorted = [...list].sort((a, b) => String(b.game_date).localeCompare(String(a.game_date)));
    const w = sorted.filter(g => g.pts > g.opp_pts).length, l = sorted.filter(g => g.pts < g.opp_pts).length;
    let streak = '';
    if (sorted.length) {
      const first = sorted[0].pts > sorted[0].opp_pts;
      let n = 0;
      for (const g of sorted) { if ((g.pts > g.opp_pts) !== first) break; n++; }
      streak = `${first ? 'G' : 'P'}${n}`;
    }
    const pf = sorted.reduce((s, g) => s + g.pts, 0), pa = sorted.reduce((s, g) => s + g.opp_pts, 0);
    const conf = TEAMS[team][0];
    return {
      team, name: TEAMS[team][2], conf, division: TEAMS[team][1], gp: sorted.length, w, l, winPct: w + l ? w / (w + l) : 0,
      home: record(sorted.filter(g => g.is_home)), away: record(sorted.filter(g => !g.is_home)),
      confRecord: record(sorted.filter(g => TEAMS[g.opponent]?.[0] === conf)),
      last10: record(sorted.slice(0, 10)), streak,
      ppg: per(pf, sorted.length), oppPpg: per(pa, sorted.length), diff: per(pf - pa, sorted.length)
    };
  });
  const order = (a, b) => b.winPct - a.winPct || b.w - a.w || (b.diff ?? 0) - (a.diff ?? 0) || a.team.localeCompare(b.team);
  const out = {};
  for (const conf of ['E', 'W']) {
    const list = rows.filter(r => r.conf === conf).sort(order);
    const lead = list[0];
    out[conf] = list.map((r, i) => ({ ...r, rank: i + 1, gb: lead ? ((lead.w - r.w) + (r.l - lead.l)) / 2 : 0 }));
  }
  return out;
}

/** Minimum volume to rank by a percentage (avoids 1-for-1 = 100 %). */
export const PCT_QUALIFIER = { fgPct: ['fga', 3], fg3Pct: ['fg3a', 1.5], ftPct: ['fta', 1.5] };

export function qualifies(row, key, maxGp) {
  if (!(key in PCT_QUALIFIER)) return true;
  const [att, min] = PCT_QUALIFIER[key];
  return row[att] >= min && row.gp >= Math.ceil(maxGp / 2);
}

/** Sorts by a column (descending by default); empty values always last. */
export function sortBy(rows, key, dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === 'string') return sign * x.localeCompare(y);
    return sign * (x - y) || String(a.name).localeCompare(String(b.name));
  });
}

/**
 * Competition ranking (1, 2, 2, 4) on the sorted column, like the NBA tables:
 * values equal at the displayed precision share a rank.
 */
export function withRanks(rows, key, decimals = 1) {
  const shown = v => (typeof v === 'number' ? Math.round(v * 10 ** decimals) : v);
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || shown(r[key]) !== shown(rows[i - 1][key])) rank = i + 1;
    return { ...r, rank };
  });
}
