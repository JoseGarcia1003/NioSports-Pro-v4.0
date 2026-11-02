// First-party observability: real-user Web Vitals and technical errors.
// Nothing personal is accepted or stored: no user id, no IP, no query string,
// only the route pattern (e.g. /sports/nba/props) and the measurement.
const METRICS = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
const RATINGS = new Set(['good', 'needs-improvement', 'poor']);
const DEVICES = new Set(['mobile', 'desktop']);
export const MAX_BODY_BYTES = 2048;
export const MAX_ITEMS = 6;

/** Route pattern only: strips query/hash, collapses ids, caps length. */
export function cleanRoute(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  const path = value.split(/[?#]/)[0].replace(/\/\d+(?=\/|$)/g, '/[id]').slice(0, 80);
  return /^\/[\w\-/[\].]*$/.test(path) ? path : null;
}

/** Removes anything that could identify a person from an error message. */
export function cleanMessage(value) {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\b(?:eyJ[\w-]+\.){2}[\w-]+\b/g, '[token]')
    .replace(/\bhttps?:\/\/\S+/g, '[url]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
  return text || null;
}

export function validateItem(item) {
  if (!item || typeof item !== 'object') return null;
  const route = cleanRoute(item.route);
  if (!route) return null;
  if (item.kind === 'vital') {
    if (!METRICS.has(item.metric) || !RATINGS.has(item.rating) || !DEVICES.has(item.device)) return null;
    if (typeof item.value !== 'number' || !Number.isFinite(item.value) || item.value < 0 || item.value >= 600000) return null;
    return { kind: 'vital', row: { metric: item.metric, value: Math.round(item.value * 1000) / 1000, rating: item.rating, route, device: item.device } };
  }
  if (item.kind === 'error') {
    const message = cleanMessage(item.message);
    if (!message) return null;
    return { kind: 'error', row: { source: 'client', route, message, status: '' } };
  }
  return null;
}

/** Parses a raw beacon body. Returns valid items (invalid ones are dropped). */
export function parseTelemetry(text) {
  if (typeof text !== 'string' || !text || text.length > MAX_BODY_BYTES) return [];
  let body;
  try { body = JSON.parse(text); } catch { return []; }
  const items = Array.isArray(body) ? body : [body];
  return items.slice(0, MAX_ITEMS).map(validateItem).filter(Boolean);
}

/** Records a server error without blocking the response; never throws. */
export async function recordServerError(db, { route, message, status }) {
  const row = { source: 'server', route: cleanRoute(route) || '/unknown', message: cleanMessage(message) || 'Error sin mensaje', status: Number.isInteger(status) ? String(status) : '' };
  try { await db.rpc('telemetry_insert', { p_kind: 'error', p_row: row }); } catch { /* observability must never break a request */ }
}

/** OWNER_USER_IDS: comma-separated user ids allowed to see the health panel. */
export function isOwner(uid, ownerIds) {
  if (typeof uid !== 'string' || !uid || typeof ownerIds !== 'string') return false;
  return ownerIds.split(',').map(s => s.trim()).filter(Boolean).includes(uid);
}
