// Human labels for internal identifiers. Users never see raw ids such as
// "nba-points@1.0.0" or "nba:points"; the exact id stays available as a title.
const MODELS = { 'nba-points': 'Modelo de puntos NBA', reading: 'Lectura por reglas' };
const MARKETS = { points: 'Puntos de jugador', rebounds: 'Rebotes', assists: 'Asistencias', pra: 'Puntos + rebotes + asistencias', team_points: 'Puntos de equipo',
  game_total: 'Total del partido', match_result: 'Resultado', total_goals: 'Total de goles', both_teams_score: 'Ambos marcan', match_winner: 'Ganador', total_games: 'Total de juegos',
  moneyline: 'Ganador', run_total: 'Total de carreras', pitcher_strikeouts: 'Ponches del lanzador' };
const SPORTS = { nba: 'NBA', football: 'Fútbol', tennis: 'Tenis', mlb: 'MLB' };

/** "nba-points@1.0.0" → "Modelo de puntos NBA · v1.0.0"; "reading@reading-v1" → "Lectura por reglas · v1". */
export function modelLabel(id) {
  if (!id) return '—';
  const [name, version = ''] = String(id).split('@');
  const v = version.replace(/^reading-/, '');
  return `${MODELS[name] ?? name}${v ? ` · ${v.startsWith('v') ? v : `v${v}`}` : ''}`;
}
export const marketLabel = m => MARKETS[m] ?? m;
export const sportLabel = s => SPORTS[s] ?? s;
/** Group keys from the track record: "nba:points" or a model id. */
export function groupLabel(key) {
  if (/^[a-z]+:[a-z_]+$/.test(key)) { const [s, m] = key.split(':'); return `${sportLabel(s)} · ${marketLabel(m)}`; }
  if (key.includes('@')) return modelLabel(key);
  return key;
}
