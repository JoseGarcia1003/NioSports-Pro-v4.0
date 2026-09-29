import { compatible, finite, reject, stageRecord } from './contracts.js';

// No line, odds, probability, result or stake is passed to the point/rating model.
export async function project(context, features, model) {
  const manifest = compatible(model, context, 'projection');
  if (JSON.stringify(manifest.featureNames) !== JSON.stringify(features.names)) reject('FEATURE_ORDER_MISMATCH');
  const value = await model.run(features.values);
  if (context.event.sport === 'basketball') {
    if (!value || Object.keys(value).length !== 1 || !finite(value.mean) || value.mean < 0) reject('INVALID_PROJECTION');
  } else if (!value || Object.keys(value).length !== 2 || !finite(value.ratingA) || !finite(value.ratingB)) reject('INVALID_PROJECTION');
  return stageRecord(context, 'projection', manifest, value);
}
