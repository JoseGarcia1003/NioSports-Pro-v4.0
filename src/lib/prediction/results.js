import { validateSnapshot, validateTrainingLabel } from '../data/contract.js';
import { ARCHITECTURE_VERSION, immutable } from './contracts.js';

// Separate post-event entry point. Does not re-run inference or modify its snapshot.
// Ticket settlement and bankroll remain the owners of F13/F14, not the model.
export function recordOutcome(snapshot, label, options={}) {
  validateSnapshot(snapshot,options);
  validateTrainingLabel({...snapshot,purpose:'training_features'},label,options);
  return immutable({version:ARCHITECTURE_VERSION,stage:'result',eventId:label.eventId,
    period:label.period,forecastAsOf:snapshot.asOf,label,sourceRevision:label.source.revision});
}
