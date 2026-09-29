export const ARCHITECTURE_VERSION = 'prediction-chain-1';
export class PredictionError extends Error {
  constructor(code) { super(code); this.name = 'PredictionError'; this.code = code; }
}
export const reject = code => { throw new PredictionError(code); };
export const finite = value => typeof value === 'number' && Number.isFinite(value);
export function immutable(value) {
  const copy = structuredClone(value);
  const freeze = object => { if (object && typeof object === 'object') { Object.values(object).forEach(freeze); Object.freeze(object); } };
  freeze(copy); return copy;
}
export function compatible(model, context, stage) {
  const m = model?.manifest;
  if (!m || typeof model.run !== 'function') reject('MODEL_UNAVAILABLE');
  if (m.schemaVersion !== ARCHITECTURE_VERSION || m.stage !== stage ||
      typeof m.id !== 'string' || !m.id || !/^[a-f0-9]{64}$/.test(m.artifactHash || '') ||
      m.sport !== context.event.sport || m.period !== context.event.period ||
      m.dataContractVersion !== context.dataContractVersion ||
      m.featureRecipeVersion !== context.featureRecipeVersion ||
      !['experimental','validated','fixture'].includes(m.validation)) reject('ARTIFACT_INCOMPATIBLE');
  if (m.validation === 'fixture' && context.origin !== 'fixture') reject('FIXTURE_MODEL_FORBIDDEN');
  if (m.validation === 'validated' && !m.validationReportId) reject('VALIDATION_EVIDENCE_MISSING');
  return m;
}
export function stageRecord(context, stage, model, value) {
  return immutable({ version: ARCHITECTURE_VERSION, stage, snapshotHash: context.snapshotHash,
    eventId: context.event.id, period: context.event.period, asOf: context.asOf,
    modelId: model.id, artifactHash: model.artifactHash, validation: model.validation, value });
}
export function sameContext(record, context, stage) {
  if (record?.version !== ARCHITECTURE_VERSION || record.stage !== stage ||
      record.snapshotHash !== context.snapshotHash || record.eventId !== context.event.id ||
      record.period !== context.event.period || record.asOf !== context.asOf) reject('STAGE_CONTEXT_MISMATCH');
}
