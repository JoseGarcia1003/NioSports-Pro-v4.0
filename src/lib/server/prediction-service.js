import { ARCHITECTURE_VERSION } from '../prediction/contracts.js';
import { present } from '../prediction/presentation.js';
import { analyzeSnapshot } from './prediction-pipeline.js';

export { capabilities } from '../prediction/capabilities.js';

// No real snapshots/models are registered yet. Do not promote the old CSV or user JSON.
const production = Object.freeze({loadSnapshot:async (_id)=>null,models:{},dataOptions:{}});
export async function requestPrediction(body, dependencies=production) {
  if (!body || body.version!==ARCHITECTURE_VERSION || typeof body.snapshotId!=='string' ||
      !/^[\w:.-]{1,150}$/.test(body.snapshotId) ||
      Object.keys(body).some(k=>!['version','snapshotId','market'].includes(k))) return present({reason:'DATA_CONTRACT_REQUIRED'});
  const snapshot=await dependencies.loadSnapshot(body.snapshotId);
  if (!snapshot) return present({reason:'SNAPSHOT_UNAVAILABLE'});
  return analyzeSnapshot(snapshot,{models:dependencies.models,dataOptions:dependencies.dataOptions,market:body.market??null});
}
