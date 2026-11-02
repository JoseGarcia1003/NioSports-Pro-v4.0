export function pickKey(pick) {
  return JSON.stringify([pick.gameId ?? pick.gameDate ?? '', pick.homeTeam, pick.awayTeam, pick.period, pick.direction, pick.line]);
}

export function savedAnalysis(pick, uid) {
  if (!uid || pick.isDemo || !Number.isFinite(pick.line) || pick.line <= 0 ||
    !Number.isFinite(pick.projection) || !['OVER', 'UNDER'].includes(pick.direction)) throw new Error('El análisis no se puede guardar.');
  return {
    user_id: uid, home_team: pick.homeTeam, away_team: pick.awayTeam,
    period: pick.period, direction: pick.direction, line: pick.line, bet_line: pick.line,
    projection: pick.projection, probability: pick.probability, confidence: pick.confidence,
    ev: Number.isFinite(pick.evPercent) ? pick.evPercent : null, edge: pick.edge,
    model_version: pick.modelVersion, source: 'model',
    odds: Number.isFinite(pick.odds) ? pick.odds : null,
    status: 'pending', created_at: new Date().toISOString(),
  };
}

export function resultUpdate(pick, result, actualTotal) {
  if (!['win', 'loss', 'push'].includes(result)) throw new Error('Resultado no válido.');
  // A correction without a score must clear any previously entered total.
  const updates = { status: result, result, actual_total: null, resolved_at: new Date().toISOString() };
  if (actualTotal !== '' && actualTotal !== undefined && actualTotal !== null) {
    const score = Number(actualTotal);
    if (!Number.isSafeInteger(score) || score < 0) throw new Error('Introduce un total entero igual o mayor que cero.');
    const line = Number(pick.line ?? pick.bet_line);
    const direction = pick.direction ?? pick.betType;
    if (!Number.isFinite(line) || line <= 0 || !['OVER', 'UNDER'].includes(direction)) throw new Error('Falta la línea o la dirección original del pick.');
    const expected = score === line ? 'push' : (direction === 'OVER' ? score > line : score < line) ? 'win' : 'loss';
    if (expected !== result) throw new Error(`Ese total corresponde a ${expected === 'win' ? 'ganado' : expected === 'loss' ? 'perdido' : 'push'}. Revisa el resultado.`);
    updates.actual_total = score;
  }
  return updates;
}
