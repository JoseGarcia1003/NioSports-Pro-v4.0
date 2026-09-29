import { compatible, finite, reject, sameContext, stageRecord } from './contracts.js';

// An explicit distribution adapter owns probability mathematics. No automatic normal fallback.
export async function probabilities(context, projection, market, model) {
  sameContext(projection, context, 'projection');
  const manifest = compatible(model, context, 'probability');
  if (manifest.projectionModelId !== projection.modelId) reject('PROBABILITY_MODEL_MISMATCH');
  const nba = context.event.sport === 'basketball';
  if (nba && (!market || market.eventId !== context.event.id || market.period !== context.event.period ||
      !finite(market.line) || market.line <= 0)) reject('MARKET_REQUIRED');
  // Odds deliberately excluded: they cannot alter the estimated probability.
  const line = nba ? market.line : null;
  const output = await model.run(projection.value, line);
  const keys = nba ? ['over','under','push'] : ['a','b'];
  if (!output || Object.keys(output).length !== keys.length || keys.some(k => !finite(output[k]) || output[k]<0 || output[k]>1) ||
      Math.abs(keys.reduce((sum,k)=>sum+output[k],0)-1)>1e-9) reject('INVALID_PROBABILITIES');
  if (nba && !Number.isInteger(line) && output.push !== 0) reject('IMPOSSIBLE_PUSH');
  return stageRecord(context, 'probability', manifest, { line, outcomes: output,
    conditionalOn: nba ? 'completed_with_overtime' : 'completed_without_retirement', projectionModelId: projection.modelId });
}
