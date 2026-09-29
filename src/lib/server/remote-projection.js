import { ARCHITECTURE_VERSION, PredictionError } from '../prediction/contracts.js';

// Server-only factory: base URL, API key and manifest must never come from a visitor.
export function remoteProjection(context, manifest, {url,key,fetcher=fetch}) {
  return {manifest,run:async values=>{
    if(!url || !key)throw new PredictionError('MODEL_UNAVAILABLE');
    const response=await fetcher(new URL('/v1/project',url),{method:'POST',
      headers:{'Content-Type':'application/json','X-API-Key':key},signal:AbortSignal.timeout(5000),
      body:JSON.stringify({version:ARCHITECTURE_VERSION,modelId:manifest.id,
        snapshotHash:context.snapshotHash,eventId:context.event.id,period:context.event.period,
        featureRecipeVersion:manifest.featureRecipeVersion,featureNames:manifest.featureNames,values})});
    if(!response.ok)throw new PredictionError('MODEL_EXECUTION_FAILED');
    const result=await response.json();
    if(result?.version!==ARCHITECTURE_VERSION || result.stage!=='projection' ||
       result.modelId!==manifest.id || result.artifactHash!==manifest.artifactHash ||
       result.validation!==manifest.validation || result.snapshotHash!==context.snapshotHash ||
       result.eventId!==context.event.id || result.period!==context.event.period)
      throw new PredictionError('ARTIFACT_INCOMPATIBLE');
    return result.value;
  }};
}
