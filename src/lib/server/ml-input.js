// Explicit feature contract: never manufacture historical windows from one mean.
export function buildMLInput(body) {
  const days = body.gameInfo?.daysIntoSeason;
  if (!Number.isInteger(days) || days < 0) return null;
  const teams = [];
  for (const team of [body.homeTeam, body.awayTeam]) {
    const stats = team?.stats?.ml;
    const fields = ['total_l5', 'total_l10', 'total_l20', 'home_avg', 'away_avg', 'std'];
    if (!stats || fields.some(key => typeof stats[key] !== 'number' || !Number.isFinite(stats[key]) || stats[key] <= 0)) return null;
    if (!Number.isInteger(team.restDays) || team.restDays < 0) return null;
    teams.push({ name: team.name, ...Object.fromEntries(fields.map(key => [key, stats[key]])), rest_days: team.restDays, is_b2b: team.restDays === 0 });
  }
  return { home_team: teams[0], away_team: teams[1], line: body.line, period: body.period ?? 'FULL', days_into_season: days };
}
