// Turns the owner health summary (ops_health RPC) into readable checks.
// Thresholds for Web Vitals are Google's "good" / "poor" limits.
export const VITAL_LIMITS = { LCP: 2500, INP: 200, CLS: 0.1, FCP: 1800, TTFB: 800 };
const POOR = { LCP: 4000, INP: 500, CLS: 0.25, FCP: 3000, TTFB: 1800 };

export function vitalStatus(metric, p75) {
  if (!(metric in VITAL_LIMITS) || !Number.isFinite(p75)) return '';
  return p75 <= VITAL_LIMITS[metric] ? 'good' : p75 <= POOR[metric] ? 'needs-improvement' : 'poor';
}

const RUN_STATUS = { ok: 'correcta', partial: 'parcial', failed: 'fallida', skipped: 'omitida' };
const hours = (from, now) => (now - Date.parse(from)) / 3600000;
const ago = h => (h < 1 ? 'hace menos de 1 h' : h < 48 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} días`);

export function healthChecks(d, now = Date.now()) {
  const out = [];
  const add = (level, title, text) => out.push({ level, title, text });

  const ingest = d?.stats?.lastIngest;
  if (!ingest) add('bad', 'Estadísticas NBA', 'No hay cargas registradas.');
  else {
    const h = hours(ingest, now);
    add(h <= 30 ? 'ok' : h <= 54 ? 'warn' : 'bad', 'Estadísticas NBA', `Último partido ${d.stats.lastGame}; última carga ${ago(h)}.${h > 30 ? ' Los box scores llegan desde la tarea programada de tu PC: comprueba que está activa.' : ''}`);
  }

  const cache = Array.isArray(d?.cache) ? d.cache : [];
  const totals = cache.find(c => c.key?.includes(':totals:'));
  if (!totals) add('warn', 'Líneas de totales', 'Sin caché todavía.');
  else {
    const q = Number(totals.quotaRemaining);
    add(!Number.isFinite(q) ? 'warn' : q < 50 ? 'bad' : q < 150 ? 'warn' : 'ok', 'Créditos The Odds API', `${Number.isFinite(q) ? q : '—'} restantes este mes; totales actualizados ${ago(hours(totals.fetchedAt, now))}.`);
  }
  const points = cache.find(c => c.key?.includes(':player-points:'));
  add(points ? 'ok' : 'warn', 'Líneas de puntos de jugadores', points ? `Actualizadas ${ago(hours(points.fetchedAt, now))}${Number.isFinite(Number(points.creditsPerGame)) && points.creditsPerGame !== null ? `; ${points.creditsPerGame} crédito(s) por partido` : ''}.` : 'Aún no se han consultado. Se piden al abrir Props con partidos próximos.');
  const diag = cache.find(c => c.key?.includes(':last-error:'));
  if (diag && hours(diag.updatedAt, now) <= 48) add('warn', 'Proveedor de cuotas', `Último fallo (${diag.market || 'mercado'}): HTTP ${diag.upstreamStatus ?? '—'} ${ago(hours(diag.updatedAt, now))}.`);

  const editions = Number(d?.signals?.editions) || 0;
  if (!editions) add('warn', 'Señales', 'Ninguna edición sellada todavía.');
  else add(hours(`${d.signals.lastDay}T12:00:00Z`, now) <= 60 ? 'ok' : 'warn', 'Señales', `${editions} ediciones; la última del ${d.signals.lastDay}.`);

  add(Number(d?.positions) > 0 ? 'ok' : 'warn', 'Posiciones de jugadores', Number(d?.positions) > 0 ? `${d.positions} jugadores con posición oficial.` : 'Sin cargar: ejecuta el script actualizado para activar la defensa por posición.');

  const runs = Array.isArray(d?.runs) ? d.runs : [];
  const box = runs.find(r => r.sport === 'nba' && r.kind === 'boxscores');
  if (box) add(box.status === 'ok' ? 'ok' : box.status === 'partial' ? 'warn' : 'bad', 'Sincronización de box scores',
    `Última ejecución ${ago(hours(box.finished_at, now))} (${box.provider}): ${RUN_STATUS[box.status] ?? box.status}${box.records_valid ? `, ${box.records_valid} filas` : ''}${box.error_code ? ` · ${box.error_code}` : ''}.`);
  const seals = d?.seals;
  if (seals && Number(seals.count) > 0) add(Number(seals.anchored) >= Number(seals.count) ? 'ok' : 'warn', 'Registro sellado', `${seals.count} sellos; ${seals.anchored} con anclaje externo.`);
  const failed = Number(d?.failedRuns24h) || 0;
  if (failed) add('warn', 'Sincronizaciones fallidas', `${failed} en las últimas 24 h.`);

  const errors = Number(d?.errors24h) || 0;
  add(errors === 0 ? 'ok' : errors < 10 ? 'warn' : 'bad', 'Errores', `${errors} en las últimas 24 h.`);
  return out;
}
