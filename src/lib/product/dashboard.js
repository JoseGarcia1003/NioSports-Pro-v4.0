// Turns the dashboard data into the short list of things worth the member's
// attention today. Pure and data-driven: every notice states a fact the server
// returned; nothing is promotional and nothing urges a bet.
const EDITION_REASON = {
  lines_unavailable: 'La edición de hoy se sella cuando las casas publiquen líneas.',
  no_upcoming_games: 'Hoy no quedan partidos por empezar; no hay edición nueva.',
  data_stale: 'Hoy no hay edición: las estadísticas guardadas no están al día y no publicamos con datos antiguos.',
  unavailable: 'No pudimos preparar la edición de hoy.'
};
const shortDay = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'long' });

export function dashboardNotices(d, now = Date.now()) {
  const out = [];
  const add = (level, id, text, href = null, action = null) => out.push({ level, id, text, href, action });
  if (d?.limits?.pauseUntil && Date.parse(d.limits.pauseUntil) > now)
    add('warn', 'pause', `Tienes una pausa activa hasta el ${new Date(d.limits.pauseUntil).toLocaleDateString('es', { day: 'numeric', month: 'long' })}. No se registran tickets nuevos.`, '/bankroll', 'Ver límites');
  for (const a of d?.limits?.alerts || []) add(a.level === 'warning' ? 'warn' : 'info', `risk:${a.id}`, a.text, '/bankroll', 'Revisar bankroll');
  if (d?.edition?.sealed) add('ok', 'edition', `Edición de hoy sellada: ${d.edition.count} ${d.edition.count === 1 ? 'señal' : 'señales'}.`, '/predictions', 'Ver señales');
  else if (d?.edition?.reason) add(d.edition.reason === 'data_stale' ? 'warn' : 'info', 'edition', EDITION_REASON[d.edition.reason] || EDITION_REASON.unavailable, '/methodology', 'Cómo funciona');
  const last = d?.record?.lastDay;
  if (last && last.decided > 0) add('info', 'results', `Resultados del ${shortDay(last.day)}: ${last.hits} de ${last.decided} señales acertadas${last.voids ? `, ${last.voids} ${last.voids === 1 ? 'anulada' : 'anuladas'}` : ''}.`, '/predictions#history-title', 'Ver historial');
  if (d?.data?.boxScoresThrough && !d.data.fresh) add('warn', 'data', `Estadísticas NBA actualizadas hasta el ${shortDay(d.data.boxScoresThrough)}. Las cifras recientes pueden no incluir los últimos partidos.`);
  if (d?.bankroll && d.bankroll.pendingTickets > 0) add('info', 'tickets', `${d.bankroll.pendingTickets} ${d.bankroll.pendingTickets === 1 ? 'ticket pendiente' : 'tickets pendientes'} de liquidar en tu bankroll.`, '/bankroll', 'Liquidar');
  return out;
}

/** Hit rate text that never overstates a small sample. */
export function recordLabel(summary, minSample = 100) {
  if (!summary || !summary.decided) return { value: '—', note: 'Sin señales liquidadas todavía' };
  return { value: `${summary.hits}/${summary.decided}`, note: summary.decided < minSample ? `Muestra pequeña (${summary.decided} de ${minSample})` : `${Math.round((summary.hits / summary.decided) * 100)} % de acierto` };
}
