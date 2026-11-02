// balldontlie uses "LA Clippers"; The Odds API uses "Los Angeles Clippers".
// Matching on the team nickname ("Clippers", "Trail Blazers") covers both.
export function sameTeam(oddsName, nickname) {
  return typeof oddsName === 'string' && typeof nickname === 'string' && nickname.length > 2 && oddsName.toLowerCase().endsWith(nickname.toLowerCase());
}

// Primary team colours for the monogram badges (no league or team logos are used).
const TEAM_COLORS = {
  ATL: '#E03A3E', BOS: '#007A33', BKN: '#2A2A2A', CHA: '#1D1160', CHI: '#CE1141', CLE: '#860038',
  DAL: '#00538C', DEN: '#0E2240', DET: '#C8102E', GSW: '#1D428A', HOU: '#CE1141', IND: '#002D62',
  LAC: '#C8102E', LAL: '#552583', MEM: '#5D76A9', MIA: '#98002E', MIL: '#00471B', MIN: '#0C2340',
  NOP: '#0C2340', NYK: '#F58426', OKC: '#007AC1', ORL: '#0077C0', PHI: '#006BB6', PHX: '#1D1160',
  POR: '#E03A3E', SAC: '#5A2D81', SAS: '#8A949B', TOR: '#CE1141', UTA: '#002B5C', WAS: '#002B5C'
};
export function teamColor(abbreviation) {
  return TEAM_COLORS[abbreviation] || '#3a4150';
}

// Game state shared by every view of today's slate.
export function gameStatus(game, format) {
  const s = String(game.status_state || '').toLowerCase();
  if (s === 'final' || /final/i.test(game.status)) return { label: 'Final', score: true, live: false };
  if (s === 'in_progress' || s === 'live' || (game.period > 0 && s !== 'scheduled')) return { label: game.period ? `En juego · C${game.period}` : 'En juego', score: true, live: true };
  const start = new Date(game.datetime);
  return { label: Number.isNaN(start.getTime()) ? 'Por confirmar' : format(start), score: false, live: false };
}

// Pair a provider game with its betting event: same nicknames, start within 12 h.
export function totalLineFor(game, lines) {
  if (!lines?.events) return null;
  const start = Date.parse(game.datetime);
  const hit = lines.events.find(e => sameTeam(e.home, game.home_team?.name) && sameTeam(e.away, game.visitor_team?.name) && Math.abs(Date.parse(e.commenceTime) - start) < 12 * 3600000);
  return hit && Number.isFinite(hit.consensus) ? { point: hit.consensus, books: hit.books.length } : null;
}

/** Accent-, punctuation- and suffix-insensitive key so "Luka Dončić" matches "Luka Doncic". */
export function playerKey(name) {
  return String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.'’-]/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

