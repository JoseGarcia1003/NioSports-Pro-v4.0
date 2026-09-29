import { ARCHITECTURE_VERSION, immutable, sameContext } from './contracts.js';

// F9 owns a validated decision policy. Architecture v1 cannot mint commercial picks.
export function decide(context, probability) {
  if (probability) sameContext(probability, context, 'probability');
  return immutable({ version: ARCHITECTURE_VERSION, stage:'decision', status:'abstained',
    eventId:context.event.id, snapshotHash:context.snapshotHash, period:context.event.period,
    policyId:'commercial-disabled-1', reason:probability ? 'DECISION_POLICY_NOT_ENABLED' : 'PROBABILITY_UNAVAILABLE',
    pick:null, ev:null, stake:null });
}
