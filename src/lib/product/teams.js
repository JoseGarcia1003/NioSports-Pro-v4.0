// balldontlie uses "LA Clippers"; The Odds API uses "Los Angeles Clippers".
// Matching on the team nickname ("Clippers", "Trail Blazers") covers both.
export function sameTeam(oddsName, nickname) {
  return typeof oddsName === 'string' && typeof nickname === 'string' && nickname.length > 2 && oddsName.toLowerCase().endsWith(nickname.toLowerCase());
}

// Primary team colours for the monogram badges (no league or team logos are used).
const TEAM_COLORS = {
  ATL: '#D9373B', BOS: '#007A33', BKN: '#2A2A2A', CHA: '#1D1160', CHI: '#CE1141', CLE: '#860038',
  DAL: '#00538C', DEN: '#0E2240', DET: '#C8102E', GSW: '#1D428A', HOU: '#CE1141', IND: '#002D62',
  LAC: '#C8102E', LAL: '#552583', MEM: '#5D76A9', MIA: '#98002E', MIL: '#00471B', MIN: '#0C2340',
  NOP: '#0C2340', NYK: '#F58426', OKC: '#007AC1', ORL: '#0077C0', PHI: '#006BB6', PHX: '#1D1160',
  POR: '#D9373B', SAC: '#5A2D81', SAS: '#8A949B', TOR: '#CE1141', UTA: '#002B5C', WAS: '#002B5C'
};
export function teamColor(abbreviation) {
  return TEAM_COLORS[abbreviation] || '#3a4150';
}

const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/** Text colour for a team badge: white or near-black, whichever reads better (WCAG). */
export function teamInk(abbreviation) {
  const bg = teamColor(abbreviation);
  return contrast('#ffffff', bg) >= contrast('#111317', bg) ? '#ffffff' : '#111317';
}

/** Inline style for a monogram badge: team colour plus readable text colour. */
export function teamStyle(abbreviation) {
  return `--team:${teamColor(abbreviation)};--team-ink:${teamInk(abbreviation)}`;
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

