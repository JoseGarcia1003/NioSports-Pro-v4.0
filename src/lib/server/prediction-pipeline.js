import { sealDataSnapshot } from './data-snapshot.js';
import { buildNbaVector, tennisPredictors, DATA_DICTIONARY } from '../data/contract.js';
import { immutable, PredictionError } from '../prediction/contracts.js';
import { project } from '../prediction/projection.js';
import { probabilities } from '../prediction/probability.js';
import { decide } from '../prediction/decision.js';
import { present } from '../prediction/presentation.js';

// Dependencies are server-owned. Never take models, providers or fixture permissions from HTTP JSON.
export async function analyzeSnapshot(snapshot, {models={},dataOptions={},market=null}={}) {
  let context=null, projection=null, probability=null;
  try {
    const sealed=sealDataSnapshot(snapshot,dataOptions);
    const nba=snapshot.event.sport==='basketball';
    const features=nba ? buildNbaVector(sealed.payload,dataOptions) : (()=>{
      const values=tennisPredictors(sealed.payload,dataOptions);
      const names=['a.overall','a.surface','b.overall','b.surface'];
      return {names,values:snapshot.event.participants.flatMap(id=>[values[id]['tennis.elo_overall'],values[id]['tennis.elo_surface']])};
    })();
    context=immutable({snapshotHash:sealed.hash,event:snapshot.event,asOf:snapshot.asOf,origin:snapshot.origin,
      dataContractVersion:DATA_DICTIONARY.version,featureRecipeVersion:nba ? DATA_DICTIONARY.featureRecipeVersion : 'tennis-elo-inputs-1'});
    projection=await project(context,immutable(features),models.projection);
    probability=await probabilities(context,projection,market,models.probability);
    return present({context,projection,probability,decision:decide(context,probability)});
  } catch(error) {
    const reason=error instanceof PredictionError ? error.code : error?.name==='DataContractError'
      ? (error.code==='UNSUPPORTED_SCOPE' ? error.code : 'INVALID_DATA') : 'MODEL_EXECUTION_FAILED';
    // Retain a completed projection as experimental evidence; never invent a probability.
    return present({context,projection,probability:null,decision:context ? decide(context,null) : null,reason});
  }
}
