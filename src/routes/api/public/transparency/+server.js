import { json } from '@sveltejs/kit';
import { publicTrackRecord } from '$lib/server/transparency.js';
import evaluation from '$lib/models/evaluations/nba-points-1.0.0.json';
import { MODEL } from '$lib/models/nba-points.js';

export async function GET() {
  try {
    const record = await publicTrackRecord();
    return json({ record, models: [{ id: MODEL.id, version: MODEL.version, trainedAt: MODEL.trainedAt, params: MODEL.params, calibration: MODEL.calibration, changelog: MODEL.changelog, backtest: evaluation }] },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } });
  } catch { return json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
