import rawDictionary from '../../../ml/contracts/dictionary.json';

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const DATA_DICTIONARY = freeze(structuredClone(rawDictionary));
export const NBA_FEATURES = Object.freeze(DATA_DICTIONARY.variables.filter(v => v.sport === 'basketball' && v.role === 'feature'));
const byName = new Map(DATA_DICTIONARY.variables.map(v => [v.name, v]));
export class DataContractError extends Error {
  constructor(code, path) { super(`${code}: ${path}`); this.name = 'DataContractError'; this.code = code; this.path = path; }
}
const fail = (code, path) => { throw new DataContractError(code, path); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 250;
const keysOnly = (value, allowed, path) => { if (Object.keys(value).some(k=>!allowed.includes(k))) fail('UNKNOWN_FIELD',path); };
export function utcInstant(value, path = 'timestamp') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) fail('INVALID_TIME', path);
  const n = Date.parse(value);
  if (!Number.isFinite(n) || new Date(n).toISOString() !== value) fail('INVALID_TIME', path);
  return n;
}
export function deriveNbaFeatures(input) {
  const result = {};
  for (const def of NBA_FEATURES) {
    let value = input[def.name];
    if (def.derive) {
      const values = def.derive.args.map(name => result[name]);
      if (def.derive.op === 'sum') value = values.reduce((a,b) => a+b,0);
      else if (def.derive.op === 'difference') value = values[0]-values[1];
      else if (def.derive.op === 'all_gte') value = Number(values.every(v => v >= def.derive.threshold));
      else fail('UNKNOWN_FORMULA', def.name);
      if (Object.hasOwn(input,def.name) && (typeof input[def.name]!=='number' || !Number.isFinite(input[def.name]) || Math.abs(input[def.name]-value)>1e-9)) fail('DERIVATION_MISMATCH',def.name);
    }
    checkValue(value, def, def.name);
    result[def.name] = value;
  }
  if (result.is_b2b_home !== Number(result.home_rest_days===0) || result.is_b2b_away !== Number(result.away_rest_days===0)) fail('REST_MISMATCH','is_b2b');
  return freeze(result);
}
function checkValue(value, def, path) {
  if (def.type === 'enum') { if (!def.values.includes(value)) fail('INVALID_ENUM',path); return; }
  if (def.type === 'string') { if (!text(value)) fail('INVALID_VALUE',path); return; }
  if (typeof value !== 'number' || !Number.isFinite(value) || (def.type==='integer' && !Number.isSafeInteger(value))) fail('INVALID_NUMBER',path);
  if ((def.min !== null && def.min !== undefined && value<def.min) || (def.max !== null && def.max !== undefined && value>def.max)) fail('OUT_OF_DOMAIN',path);
}
function verifySample(obs, def, cutoff) {
  if (!def.window) return;
  const sample = obs.sample;
  if (!object(sample) || sample.complete !== true || !Array.isArray(sample.records) || sample.records.length !== def.window) fail('INSUFFICIENT_WINDOW',obs.id);
  keysOnly(sample,['complete','records'],obs.id);
  const ids = new Set();
  let previous = -Infinity;
  for (const record of sample.records) {
    if (!object(record)) fail('INVALID_HISTORY_VALUE',obs.id);
    keysOnly(record,['id','endedAt','availableAt','capturedAt','value','venue'],obs.id);
    if (!text(record.id) || ids.has(record.id)) fail('DUPLICATE_HISTORY',obs.id);
    ids.add(record.id);
    const end=utcInstant(record.endedAt,obs.id), available=utcInstant(record.availableAt,obs.id), captured=utcInstant(record.capturedAt,obs.id);
    if (end>=cutoff || available>cutoff || captured>cutoff || end>available || available>captured || end<previous || end>utcInstant(obs.measuredAt) || available>utcInstant(obs.availableAt) || captured>utcInstant(obs.capturedAt)) fail('INVALID_HISTORY_TIME',obs.id);
    if (!Number.isSafeInteger(record.value) || record.value<0 || !['home','away'].includes(record.venue)) fail('INVALID_HISTORY_VALUE',obs.id);
    previous=end;
  }
  const records = def.venue ? sample.records.filter(r=>r.venue===def.venue) : sample.records;
  if (!records.length) fail('MISSING_VENUE_HISTORY',obs.id);
  const mean = records.reduce((n,r)=>n+r.value,0)/records.length;
  const value = def.aggregation==='population_std' ? Math.sqrt(records.reduce((n,r)=>n+(r.value-mean)**2,0)/records.length) : mean;
  if (Math.abs(value-obs.value)>1e-9) fail('AGGREGATE_MISMATCH',obs.id);
}
// Pure validation. Caller must authenticate the provider; metadata alone proves no provenance.
export function validateSnapshot(input, { now=Date.now(), allowFixtures=false, trustedProviders=[], maxAgeMs=null }={}) {
  if (!object(input) || input.schemaVersion!==DATA_DICTIONARY.version) fail('SCHEMA_VERSION','snapshot');
  keysOnly(input,['schemaVersion','purpose','origin','asOf','event','previousHash','observations'],'snapshot');
  if (!['inference','training_features'].includes(input.purpose) || !['observed','manual','fixture'].includes(input.origin)) fail('INVALID_PURPOSE','snapshot');
  if (input.origin==='fixture' && !allowFixtures) fail('FIXTURE_FORBIDDEN','snapshot');
  if (input.origin==='manual') fail('UNVERIFIED_MANUAL','snapshot'); // Store as raw evidence, never eligible model input.
  const cutoff=utcInstant(input.asOf,'asOf');
  if (!Number.isFinite(now) || cutoff>now) fail('FUTURE_CUTOFF','asOf');
  if (maxAgeMs!==null && (!Number.isSafeInteger(maxAgeMs) || maxAgeMs<0)) fail('INVALID_FRESHNESS_POLICY','maxAgeMs');
  const event=input.event;
  if (!object(event) || !['basketball','tennis'].includes(event.sport) || !['id','league','season','timezone'].every(k=>text(event[k]))) fail('INVALID_EVENT','event');
  keysOnly(event,['id','sport','league','season','period','startsAt','timezone','participants'],'event');
  try { new Intl.DateTimeFormat('en',{timeZone:event.timezone}); } catch { fail('INVALID_TIMEZONE','event.timezone'); }
  if (!Array.isArray(event.participants) || event.participants.length!==2 || !event.participants.every(text) || event.participants[0]===event.participants[1]) fail('INVALID_PARTICIPANTS','event.participants');
  if (cutoff>=utcInstant(event.startsAt,'event.startsAt')) fail('NOT_PREMATCH','asOf');
  if (!((event.sport==='basketball' && event.league==='NBA' && event.period==='FULL') || (event.sport==='tennis' && ['ATP','WTA','Challenger','WTA 125','ITF Men','ITF Women'].includes(event.league) && event.period==='MATCH'))) fail('UNSUPPORTED_SCOPE','event');
  if (input.previousHash!==null && !/^[a-f0-9]{64}$/.test(input.previousHash??'')) fail('INVALID_PREVIOUS_HASH','previousHash');
  if (!Array.isArray(input.observations) || input.observations.length===0 || input.observations.length>200) fail('INVALID_OBSERVATIONS','observations');
  const ids=new Set(), keys=new Set();
  for (const obs of input.observations) {
    if (!object(obs) || !text(obs.id) || ids.has(obs.id)) fail('DUPLICATE_OBSERVATION','observations');
    keysOnly(obs,['id','variable','entityId','value','unit','source','capturedAt','availableAt','measuredAt','sample','missingReason','rawValue'],'observation');
    ids.add(obs.id);
    const def=byName.get(obs.variable);
    if (!def || def.role==='target' || def.derive) fail('FORBIDDEN_VARIABLE',obs.variable);
    if (def.sport!==event.sport || !def.league.includes(event.league) || !def.period.includes(event.period)) fail('SCOPE_MISMATCH',obs.variable);
    const key=obs.variable+':'+obs.entityId;
    if (keys.has(key) || ![event.id,...event.participants].includes(obs.entityId)) fail('INVALID_ENTITY',obs.variable);
    keys.add(key);
    if (obs.unit!==def.unit) fail('UNIT_MISMATCH',obs.variable);
    const source=obs.source;
    if (!object(source) || !text(source.provider) || !text(source.recordId) || !text(source.revision) || !['provider','fixture'].includes(source.kind)) fail('MISSING_PROVENANCE',obs.id);
    keysOnly(source,['provider','recordId','revision','kind','publishedAt'],'source');
    if ((input.origin==='fixture') !== (source.kind==='fixture')) fail('ORIGIN_MISMATCH',obs.id);
    if (input.origin==='observed' && !trustedProviders.includes(source.provider)) fail('UNTRUSTED_PROVIDER',obs.id);
    const published=utcInstant(source.publishedAt,obs.id), available=utcInstant(obs.availableAt,obs.id), captured=utcInstant(obs.capturedAt,obs.id), measured=utcInstant(obs.measuredAt,obs.id);
    if (measured>available || published>available || available>captured || captured>cutoff) fail('AFTER_CUTOFF_OR_INVALID_ORDER',obs.id);
    if (maxAgeMs!==null && cutoff-available>maxAgeMs) fail('STALE_OBSERVATION',obs.id);
    if (obs.value===null) { if (!text(obs.missingReason)) fail('MISSING_REASON',obs.id); continue; }
    if (obs.missingReason!==null) fail('UNEXPECTED_MISSING_REASON',obs.id);
    checkValue(obs.value,def,obs.id);
    verifySample(obs,def,cutoff);
    if (def.transform) {
      const cap=def.max;
      if (!Number.isSafeInteger(obs.rawValue) || obs.rawValue<0 || Math.min(obs.rawValue,cap)!==obs.value) fail('INVALID_TRANSFORM',obs.id);
    }
  }
  return true;
}
export function buildNbaVector(snapshot, options={}) {
  validateSnapshot(snapshot,options);
  if (snapshot.event.sport!=='basketball') fail('SCOPE_MISMATCH','NBA');
  const values={}, rows=new Map();
  for (const obs of snapshot.observations) {
    if (obs.value===null) fail('MISSING_FEATURE',obs.variable);
    const expected=obs.variable.startsWith('home_') || obs.variable==='is_b2b_home' ? snapshot.event.participants[0]
      : obs.variable.startsWith('away_') || obs.variable==='is_b2b_away' ? snapshot.event.participants[1] : snapshot.event.id;
    if (obs.entityId!==expected || rows.has(obs.variable)) fail('FEATURE_ENTITY_MISMATCH',obs.variable);
    rows.set(obs.variable,obs); values[obs.variable]=obs.value;
  }
  const result=deriveNbaFeatures(values);
  if (result.rest_diff !== rows.get('home_rest_days').rawValue-rows.get('away_rest_days').rawValue) fail('REST_MISMATCH','rest_diff');
  for (const side of ['home','away']) {
    const full=rows.get(side+'_total_l20').sample.records;
    const fingerprint = records => JSON.stringify(records.map(r=>[r.id,r.endedAt,r.availableAt,r.capturedAt,r.value,r.venue]));
    for (const [name,n] of [[side+'_total_l5',5],[side+'_total_l10',10],[side+'_'+side+'_avg',10],[side+'_std',10]]) {
      if (fingerprint(rows.get(name).sample.records)!==fingerprint(full.slice(-n))) fail('INCONSISTENT_WINDOWS',name);
    }
  }
  return freeze({version:DATA_DICTIONARY.featureRecipeVersion,names:NBA_FEATURES.map(f=>f.name),values:NBA_FEATURES.map(f=>result[f.name]),byName:result});
}
// Eligibility is not a model: no Elo calculations or assumed missing injury status.
export function tennisPredictors(snapshot,options={}) {
  validateSnapshot(snapshot,options);
  if (snapshot.event.sport!=='tennis') fail('SCOPE_MISMATCH','tennis');
  const required=['tennis.elo_overall','tennis.elo_surface','tennis.history_count','tennis.surface_count'];
  const result={};
  for (const player of snapshot.event.participants) {
    result[player]={};
    for (const name of required) {
      const obs=snapshot.observations.find(o=>o.variable===name && o.entityId===player);
      if (!obs || obs.value===null) fail('MISSING_FEATURE',name);
      result[player][name]=obs.value;
    }
    if (result[player]['tennis.surface_count']>result[player]['tennis.history_count']) fail('INCONSISTENT_COUNT',player);
  }
  for (const name of ['tennis.surface','tennis.best_of']) {
    const obs=snapshot.observations.find(o=>o.variable===name && o.entityId===snapshot.event.id);
    if (!obs || obs.value===null) fail('MISSING_FEATURE',name);
    result[name]=obs.value;
  }
  return freeze(result);
}

// Targets are separate records: their post-game timestamps must never enter X.
export function validateTrainingLabel(snapshot,label,options={}) {
  validateSnapshot(snapshot,options);
  if (snapshot.purpose!=='training_features' || !object(label)) fail('INVALID_TRAINING_PAIR','label');
  keysOnly(label,['eventId','period','variable','value','unit','status','endedAt','availableAt','capturedAt','source'],'label');
  const event=snapshot.event;
  if (label.eventId!==event.id || label.period!==event.period || label.status!=='completed') fail('LABEL_SCOPE_OR_STATUS','label');
  const name=event.sport==='basketball'?'actual_total':'tennis.winner';
  const def=byName.get(name);
  if (label.variable!==name || label.unit!==def.unit) fail('LABEL_VARIABLE','label');
  checkValue(label.value,def,'label.value');
  if (event.sport==='tennis' && !event.participants.includes(label.value)) fail('LABEL_PARTICIPANT','label.value');
  const end=utcInstant(label.endedAt),available=utcInstant(label.availableAt),captured=utcInstant(label.capturedAt);
  if (end<=utcInstant(event.startsAt) || end>available || available>captured || captured>(options.now??Date.now())) fail('LABEL_TIME','label');
  const source=label.source;
  if (!object(source) || !['provider','recordId','revision'].every(k=>text(source[k]))) fail('MISSING_PROVENANCE','label');
  keysOnly(source,['provider','recordId','revision','kind','publishedAt'],'label.source');
  if (utcInstant(source.publishedAt)>available) fail('LABEL_TIME','label.source');
  if (snapshot.origin==='fixture' ? source.kind!=='fixture' : source.kind!=='provider' || !(options.trustedProviders??[]).includes(source.provider)) fail('ORIGIN_MISMATCH','label');
  return true;
}
