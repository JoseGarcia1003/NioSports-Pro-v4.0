import { createHash } from 'node:crypto';
import { validateSnapshot } from '../data/contract.js';
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object'
  ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
const freeze = value => { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value; };
export function sealDataSnapshot(input,options={}) {
  validateSnapshot(input,options);
  // Reject non-JSON values rather than silently converting them to null/omitting metadata.
  const json=JSON.stringify(input,(_key,value)=>{
    if (value===undefined || typeof value==='function' || typeof value==='symbol' || typeof value==='bigint' || (typeof value==='number'&&!Number.isFinite(value))) throw new Error('Non-JSON snapshot');
    return value;
  });
  const payload=canonical(JSON.parse(json));
  return freeze({hash:createHash('sha256').update(JSON.stringify(payload)).digest('hex'),payload});
}
export function reviseDataSnapshot(previous,input,options={}) {
  const verified=sealDataSnapshot(previous.payload,options);
  if (verified.hash!==previous.hash || input.previousHash!==previous.hash) throw new Error('Snapshot chain mismatch');
  if (input.event.id!==previous.payload.event.id || input.asOf<=previous.payload.asOf) throw new Error('Invalid revision scope or cutoff');
  for (const field of ['sport','league','season','period','participants']) {
    if (JSON.stringify(input.event[field])!==JSON.stringify(previous.payload.event[field])) throw new Error('Revision changes event identity');
  }
  if (input.origin!==previous.payload.origin || input.purpose!==previous.payload.purpose) throw new Error('Revision changes origin or purpose');
  for (const obs of input.observations) {
    const old=previous.payload.observations.find(o=>o.variable===obs.variable && o.entityId===obs.entityId);
    if (old && JSON.stringify(canonical(old))!==JSON.stringify(canonical(obs)) && old.source.provider===obs.source.provider && old.source.recordId===obs.source.recordId && old.source.revision===obs.source.revision) throw new Error('Changed observation needs a source revision');
  }
  const sealed=sealDataSnapshot(input,options);
  if (sealed.hash===previous.hash) throw new Error('Revision must change content');
  return sealed;
}
