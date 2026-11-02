// Columns of the leaders tables. Abbreviations follow the official NBA tables
// (the same ones used by sportsbooks); `title` explains each one in Spanish.
// d = decimals shown; pct = percentage column.
export const PLAYER_COLUMNS = [
  { key: 'gp', label: 'PJ', title: 'Partidos jugados', d: 0 },
  { key: 'min', label: 'MIN', title: 'Minutos por partido', d: 1 },
  { key: 'pts', label: 'PTS', title: 'Puntos por partido', d: 1 },
  { key: 'reb', label: 'REB', title: 'Rebotes por partido', d: 1 },
  { key: 'ast', label: 'AST', title: 'Asistencias por partido', d: 1 },
  { key: 'fg3m', label: '3PM', title: 'Triples anotados por partido', d: 1 },
  { key: 'stl', label: 'STL', title: 'Robos por partido', d: 1 },
  { key: 'blk', label: 'BLK', title: 'Tapones por partido', d: 1 },
  { key: 'fgm', label: 'FGM', title: 'Tiros de campo anotados', d: 1 },
  { key: 'fga', label: 'FGA', title: 'Tiros de campo intentados', d: 1 },
  { key: 'fgPct', label: 'FG%', title: 'Porcentaje de tiros de campo', d: 1, pct: true },
  { key: 'fg3a', label: '3PA', title: 'Triples intentados', d: 1 },
  { key: 'fg3Pct', label: '3P%', title: 'Porcentaje de triples', d: 1, pct: true },
  { key: 'ftm', label: 'FTM', title: 'Tiros libres anotados', d: 1 },
  { key: 'fta', label: 'FTA', title: 'Tiros libres intentados', d: 1 },
  { key: 'ftPct', label: 'FT%', title: 'Porcentaje de tiros libres', d: 1, pct: true },
  { key: 'oreb', label: 'OREB', title: 'Rebotes ofensivos', d: 1 },
  { key: 'dreb', label: 'DREB', title: 'Rebotes defensivos', d: 1 },
  { key: 'tov', label: 'TOV', title: 'Pérdidas por partido', d: 1 },
  { key: 'pf', label: 'PF', title: 'Faltas personales', d: 1 },
  { key: 'pm', label: '+/-', title: 'Más/menos: diferencia de puntos con el jugador en pista', d: 1, signed: true }
];

export const TEAM_COLUMNS = [
  { key: 'gp', label: 'PJ', title: 'Partidos jugados', d: 0 },
  { key: 'w', label: 'G', title: 'Ganados', d: 0 },
  { key: 'l', label: 'P', title: 'Perdidos', d: 0 },
  { key: 'winPct', label: '%V', title: 'Porcentaje de victorias', d: 3, ratio: true },
  { key: 'pts', label: 'PTS', title: 'Puntos anotados por partido', d: 1 },
  { key: 'oppPts', label: 'RIV', title: 'Puntos permitidos por partido', d: 1 },
  { key: 'diff', label: 'DIF', title: 'Diferencia de puntos por partido', d: 1, signed: true },
  { key: 'fgPct', label: 'FG%', title: 'Porcentaje de tiros de campo', d: 1, pct: true },
  { key: 'fg3m', label: '3PM', title: 'Triples anotados', d: 1 },
  { key: 'fg3Pct', label: '3P%', title: 'Porcentaje de triples', d: 1, pct: true },
  { key: 'ftPct', label: 'FT%', title: 'Porcentaje de tiros libres', d: 1, pct: true },
  { key: 'reb', label: 'REB', title: 'Rebotes', d: 1 },
  { key: 'oreb', label: 'OREB', title: 'Rebotes ofensivos', d: 1 },
  { key: 'ast', label: 'AST', title: 'Asistencias', d: 1 },
  { key: 'tov', label: 'TOV', title: 'Pérdidas', d: 1 },
  { key: 'stl', label: 'STL', title: 'Robos', d: 1 },
  { key: 'blk', label: 'BLK', title: 'Tapones', d: 1 },
  { key: 'pf', label: 'PF', title: 'Faltas personales', d: 1 }
];

/** Quick leader shortcuts shown above the players table. */
export const QUICK_STATS = ['pts', 'reb', 'ast', 'fg3m', 'stl', 'blk', 'fgPct', 'fg3Pct', 'ftPct', 'min'];

/** Formats a cell like the official tables (.857 for win %, 48.2 for %, +5.2). */
export function formatStat(col, v) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (col.ratio) return v >= 1 ? '1.000' : v.toFixed(3).replace(/^0/, '');
  const text = v.toLocaleString('es', { minimumFractionDigits: col.d, maximumFractionDigits: col.d });
  return col.signed && v > 0 ? `+${text}` : text;
}
