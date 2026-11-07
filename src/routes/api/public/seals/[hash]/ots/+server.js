import { error } from '@sveltejs/kit';
import { adminDatabase } from '$lib/server/entitlements.js';
import { anchorProof, CALENDAR_SET } from '$lib/server/seals.js';

// Downloads the OpenTimestamps proof (.ots) for one seal, verifiable with the
// standard `ots verify` tool or at opentimestamps.org without trusting us.
export async function GET({ params, url }) {
  if (!/^[0-9a-f]{64}$/.test(params.hash)) error(400, 'Invalid hash');
  const calendar = url.searchParams.get('calendar') || '';
  if (!CALENDAR_SET.has(calendar)) error(400, 'Unknown calendar');
  const proof = await anchorProof(adminDatabase(), params.hash, calendar);
  if (!proof) error(404, 'No proof for this seal yet');
  return new Response(proof, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="niosports-${params.hash.slice(0, 16)}.ots"`, 'Cache-Control': 'public, max-age=3600' } });
}
