import { adminDatabase } from '$lib/server/entitlements.js';
import { parseTelemetry, MAX_BODY_BYTES } from '$lib/server/telemetry.js';

// Receives anonymous Web Vitals and client errors (navigator.sendBeacon).
// Always answers 204: telemetry never shows errors to the visitor.
export async function POST({ request }) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) return new Response(null, { status: 204 });
  let text = '';
  try { text = await request.text(); } catch { return new Response(null, { status: 204 }); }
  const items = parseTelemetry(text);
  if (items.length) {
    try {
      const db = adminDatabase();
      await Promise.all(items.map(i => db.rpc('telemetry_insert', { p_kind: i.kind, p_row: i.row })));
    } catch { /* database unavailable: drop silently */ }
  }
  return new Response(null, { status: 204 });
}
