/** BallDontLie NBA full-game totals only. Missing identity/data means abstention. */
export function settleNbaTotal(pick, dbGame, result) {
  if (!dbGame?.id || !dbGame.external_id || !result?.id ||
      String(dbGame.external_id) !== String(result.id) || pick.game_id !== dbGame.id) return null;
  if (result.status !== 'Final' || pick.period !== 'FULL' || pick.is_combo) return null;
  if (['demo', 'backtest', 'synthetic'].includes(pick.source)) return null;
  const direction = pick.bet_type ?? pick.direction;
  if (pick.bet_type && pick.direction && pick.bet_type !== pick.direction) return null;
  if (!['OVER', 'UNDER'].includes(direction) || !Number.isFinite(pick.line) || pick.line <= 0) return null;
  const scores = [result.home_team_score, result.visitor_team_score];
  if (!scores.every(score => Number.isInteger(score) && score >= 0)) return null;
  const actualTotal = scores[0] + scores[1];
  const outcome = actualTotal === pick.line ? 'push'
    : (direction === 'OVER' ? actualTotal > pick.line : actualTotal < pick.line) ? 'win' : 'loss';
  return { outcome, actualTotal };
}
