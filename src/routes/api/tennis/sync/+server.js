import { json } from '@sveltejs/kit';
import { requireJobSecret } from '$lib/server/job-secret.js';
import { ingestTennis } from '$lib/server/tennis-feed.js';

// Pulls the validated tennis dataset from the configured provider (job secret).
export async function POST({ request }) {
  requireJobSecret(request);
  try { return json(await ingestTennis(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return json({ error: 'La sincronización de tenis falló. Revisa el proveedor, contrato y almacenamiento.' }, { status: 503 }); }
}
