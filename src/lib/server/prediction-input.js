const periods = ['Q1', 'HALF', 'FULL'];
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

// Check only supported inputs. Presence is not proof of provider provenance.
export function predictionInputError(body) {
  if (!body || typeof body !== 'object') return 'Solicitud inválida.';
  const period = body.period ?? 'FULL';
  if (!periods.includes(period)) return 'Período no admitido.';
  if (!positive(body.line)) return 'Introduce una línea de mercado positiva.';
  const names = [body.homeTeam?.name, body.awayTeam?.name];
  if (names.some(name => typeof name !== 'string' || !name.trim() || name.length > 100)) return 'Selecciona ambos equipos.';
  if (names[0].trim().toLowerCase() === names[1].trim().toLowerCase()) return 'Los equipos deben ser distintos.';
  const key = period.toLowerCase();
  for (const [team, venue] of [[body.homeTeam,'Home'], [body.awayTeam,'Away']]) {
    const stats = team.stats;
    if (!stats || typeof stats !== 'object') return 'No hay estadísticas suficientes para este período.';
    const keys = [key,`${key}${venue}`,`${key}Last5`,`${key}Last10`,`${key}Season`];
    if (keys.some(k => stats[k] !== undefined && !positive(stats[k]))) return 'Las estadísticas del período contienen valores inválidos.';
    const complete = positive(stats[key]) || positive(stats[`${key}${venue}`]) ||
      [`${key}Last5`,`${key}Last10`,`${key}Season`].every(k => positive(stats[k]));
    if (!complete) return 'No hay estadísticas suficientes para este período.';
  }
  return null;
}
