import { json } from '@sveltejs/kit';

// The legacy public track record mixed unsealed records and estimated ROI. It stays
// disabled until picks are stored with a timestamp before tip-off and settled automatically.
export function GET() {
  return json(
    { error: 'track_record_unavailable', message: 'El historial público se publicará solo con pronósticos registrados antes de cada partido.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
