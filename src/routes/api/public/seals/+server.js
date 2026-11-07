import { json } from '@sveltejs/kit';
import { adminDatabase } from '$lib/server/entitlements.js';
import { publicLedger } from '$lib/server/seals.js';

// Public, unauthenticated: the hash chain is always visible; the sealed content
// of an edition appears only after its last event has started (commit-reveal).
export async function GET({ url }) {
  const before = Number(url.searchParams.get('before')) || null;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 60));
  try {
    const seals = await publicLedger(adminDatabase(), { limit, before });
    return json({ schema: 'niosports.ledger/v1', algorithm: 'SHA-256 sobre JSON canónico (RFC 8785)', genesis: '0'.repeat(64), seals },
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } });
  } catch { return json({ error: 'ledger_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
