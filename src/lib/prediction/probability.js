import { compatible, finite, reject, sameContext, stageRecord } from './contracts.js';
import { PROBABILITY_VERSION, totalLine } from './distribution.js';

// An explicit distribution adapter owns probability mathematics. No automatic normal fallback.
export async function probabilities(context, projection, market, model) {
  sameContext(projection, context, 'projection');
  const nba = context.event.sport === 'basketball';
  if (!(nba && context.event.period === 'FULL') &&
      !(context.event.sport === 'tennis' && context.event.period === 'MATCH')) reject('UNSUPPORTED_SCOPE');
  const manifest = compatible(model, context, 'probability');
  if (manifest.projectionModelId !== projection.modelId || manifest.projectionArtifactHash !== projection.artifactHash)
    reject('PROBABILITY_MODEL_MISMATCH');
  if (manifest.probabilityContractVersion !== PROBABILITY_VERSION ||
      !(nba ? ['discrete-pmf-1','fixture-explicit-1'] : ['elo-400-1','fixture-explicit-1']).includes(manifest.method) ||
      (manifest.method === 'fixture-explicit-1' && context.origin !== 'fixture')) reject('PROBABILITY_CONTRACT_REQUIRED');
  if (market && Object.keys(market).some(k=>!['eventId','period','line','odds'].includes(k))) reject('UNSUPPORTED_MARKET');
  if (nba && (!market || market.eventId !== context.event.id || market.period !== context.event.period ||
      !finite(market.line) || market.line <= 0)) reject('MARKET_REQUIRED');
  // Odds deliberately excluded: they cannot alter the estimated probability.
  const line = nba ? totalLine(market.line) : null;
  if (!nba && (!Array.isArray(context.event.participants) || context.event.participants.length!==2 ||
      context.event.participants[0]===context.event.participants[1])) reject('INVALID_PARTICIPANTS');
  if (!nba && market !== null && market !== undefined &&
      (market.eventId !== context.event.id || market.period !== 'MATCH' || market.line != null)) reject('MARKET_REQUIRED');
  const output = await model.run(projection.value, line);
  const keys = nba ? ['over','under','push'] : ['a','b'];
  if (!output || Object.keys(output).length !== keys.length || keys.some(k => !finite(output[k]) || output[k]<0 || output[k]>1) ||
      Math.abs(keys.reduce((sum,k)=>sum+output[k],0)-1)>1e-9) reject('INVALID_PROBABILITIES');
  if (nba && !Number.isInteger(line) && output.push !== 0) reject('IMPOSSIBLE_PUSH');
  return stageRecord(context, 'probability', manifest, { contractVersion:PROBABILITY_VERSION,
    target:nba ? 'total_points_including_overtime' : 'match_winner', method:manifest.method,
    outcomeEntities:nba ? null : {a:context.event.participants[0],b:context.event.participants[1]},
    line, outcomes: output, calibrated:false,
    conditionalOn: nba ? 'completed_with_overtime' : 'completed_without_retirement',
    projectionModelId: projection.modelId, projectionArtifactHash:projection.artifactHash });
}
