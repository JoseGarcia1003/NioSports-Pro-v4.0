// Anonymous real-user monitoring: Web Vitals (Google's web-vitals) and uncaught
// errors, sent with sendBeacon to /api/telemetry. Only the route pattern
// (e.g. /sports/nba/props) and the measurement travel; no ids, no query strings.
const ENDPOINT = '/api/telemetry';
const MAX_ERRORS = 5;

export function deviceClass(width = typeof innerWidth === 'number' ? innerWidth : 1024) {
  return width <= 768 ? 'mobile' : 'desktop';
}

export function send(payload, nav = typeof navigator !== 'undefined' ? navigator : null) {
  try {
    const body = JSON.stringify(payload);
    if (nav?.sendBeacon && nav.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))) return true;
    if (typeof fetch === 'function') fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
    return true;
  } catch { return false; }
}

/** Builds the error reporter: deduplicated and capped per page load. */
export function errorReporter(getRoute, post = send) {
  const seen = new Set();
  return message => {
    // Scrubbed here too (the server cleans again): emails, URLs and tokens never leave the browser.
    const text = String(message || '')
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
      .replace(/\bhttps?:\/\/\S+/g, '[url]')
      .replace(/\b(?:eyJ[\w-]+\.){2}[\w-]+\b/g, '[token]')
      .slice(0, 300);
    if (!text || seen.has(text) || seen.size >= MAX_ERRORS) return false;
    seen.add(text);
    return post({ kind: 'error', route: getRoute(), message: text });
  };
}

/**
 * Starts monitoring once, after first paint. getRoute returns the current route
 * pattern (SvelteKit $page.route.id). Safe to call in any browser; no-ops elsewhere.
 */
export async function startTelemetry(getRoute) {
  if (typeof window === 'undefined' || window.__nioTelemetry) return;
  window.__nioTelemetry = true;
  const route = () => getRoute() || '/';
  const report = errorReporter(route);
  window.addEventListener('error', e => report(e?.message || e?.error?.message));
  window.addEventListener('unhandledrejection', e => report(e?.reason?.message || String(e?.reason ?? '')));
  try {
    const { onLCP, onINP, onCLS, onFCP, onTTFB } = await import('web-vitals');
    const vital = m => send({ kind: 'vital', metric: m.name, value: m.value, rating: m.rating, route: route(), device: deviceClass() });
    onLCP(vital); onINP(vital); onCLS(vital); onFCP(vital); onTTFB(vital);
  } catch { /* monitoring is optional */ }
}
