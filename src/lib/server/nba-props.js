import { calendarDays } from '$lib/tennis/domain.js';

// Builds today's (or tomorrow's) props board: provider schedule + ingested box scores.
const BDL = 'https://api.balldontlie.io/v1/games';
export const MIN_MINUTES_L5 = 12;

export async function scheduleFor(day, apiKey, fetchImpl = fetch) {
  const res = await fetchImpl(`${BDL}?${new URLSearchParams({ 'dates[]': day })}`, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`schedule ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.data)) throw new Error('schedule payload');
  return body.data.map(g => ({ id: g.id, datetime: g.datetime, status: g.status_state || g.status, home: g.home_team.abbreviation, visitor: g.visitor_team.abbreviation, homeName: g.home_team.full_name, visitorName: g.visitor_team.full_name }));
}

/** Keeps rotation players of the current season and attaches tonight's opponent. */
export function selectPlayers(rows, games) {
  const opponent = new Map();
  for (const g of games) { opponent.set(g.home, { opp: g.visitor, home: true, gameId: g.id }); opponent.set(g.visitor, { opp: g.home, home: false, gameId: g.id }); }
  const season = rows.reduce((max, r) => { const s = r.games?.[0]?.[8]; return s && (!max || s > max) ? s : max; }, null);
  return rows
    .filter(r => Array.isArray(r.games) && r.games.length && r.games[0][8] === season && opponent.has(r.team))
    .map(r => {
      const l5 = r.games.slice(0, 5);
      const minutes = l5.reduce((s, g) => s + Number(g[3]), 0) / l5.length;
      return { id: r.player_id, name: r.player_name, team: r.team, ...opponent.get(r.team), minutesL5: Math.round(minutes * 10) / 10, games: r.games };
    })
    .filter(p => p.minutesL5 >= MIN_MINUTES_L5)
    .sort((a, b) => b.minutesL5 - a.minutesL5);
}

export function dayFor(offset, now = Date.now()) {
  return calendarDays(now, 'America/New_York')[offset];
}
