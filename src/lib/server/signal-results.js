// Official box scores for sealed signals. A player with no row on a day his
// team has a stored game did not take the court: the signal is void, not pending.
export async function loadBoxScores(db, entriesByDay) {
  const players = new Set(), days = new Set();
  for (const [day, entries] of entriesByDay) { days.add(day); for (const e of entries) if (e.playerId) players.add(e.playerId); }
  const box = new Map(), teamsPlayed = new Set();
  if (!players.size) return () => null;
  const dayList = [...days];
  const [{ data: rows, error }, { data: teams, error: e2 }] = await Promise.all([
    db.from('nba_player_games').select('player_id, game_date, pts, minutes').in('player_id', [...players]).in('game_date', dayList),
    db.rpc('nba_teams_played', { p_days: dayList })
  ]);
  if (error || e2) throw new Error('box_scores_unavailable');
  for (const r of rows || []) box.set(`${r.player_id}:${r.game_date}`, { pts: r.pts, minutes: Number(r.minutes) });
  for (const t of teams || []) teamsPlayed.add(`${t.team}:${t.game_date}`);
  return (entry, day) => box.get(`${entry.playerId}:${day}`) || (teamsPlayed.has(`${entry.team}:${day}`) ? { pts: 0, minutes: 0, absent: true } : null);
}
