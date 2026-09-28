import { describe,it,expect } from 'vitest';
import { DATA_DICTIONARY,NBA_FEATURES,validateSnapshot,buildNbaVector,tennisPredictors,deriveNbaFeatures,utcInstant,validateTrainingLabel } from '../../src/lib/data/contract.js';
import { sealDataSnapshot,reviseDataSnapshot } from '../../src/lib/server/data-snapshot.js';
import { nbaSnapshot,tennisSnapshot,observation,OPTIONS } from '../fixtures/data-contract.js';
import reference from '../fixtures/nba-contract-vector.json';
const change=(name,edit)=>{const s=nbaSnapshot();edit(s.observations.find(o=>o.variable===name),s);return s;};
describe('versioned data contract',()=>{
  it('documents the exact ordered 26-feature vector and reconstructs windows',()=>{
    const s=nbaSnapshot(), v=buildNbaVector(s,OPTIONS);
    expect(v.names).toEqual(NBA_FEATURES.map(f=>f.name));expect(v.values).toHaveLength(26);
    expect(v.byName.home_total_l5).toBe(217);expect(v.byName.home_total_l10).toBe(214.5);
    expect(v.byName.total_sum_l5).toBe(444);expect(v.byName.momentum_5v10).toBe(5);
    expect(v.byName.home_std).toBeCloseTo(Math.sqrt(8.25),10);
  });
  it('matches the shared independent reference vector',()=>expect(deriveNbaFeatures(reference.input)).toEqual(reference.expected));
  it('records definitions for all values and never mutates dictionary',()=>{
    expect(Object.isFrozen(DATA_DICTIONARY.variables)).toBe(true);
    for(const d of DATA_DICTIONARY.variables)for(const name of ['name','type','unit','source','missing','extremes','version','update','training','inference','sport','league','period'])expect(d).toHaveProperty(name);
  });
  it.each([
    ['schema',s=>s.schemaVersion='0'],
    ['future cutoff',s=>s.asOf='2026-02-03T10:00:00.000Z'],
    ['already started',s=>s.event.startsAt=s.asOf],
    ['quarter',s=>s.event.period='Q1'],
    ['target',s=>s.observations.push(observation('actual_total',220))],
    ['hidden target',s=>s.actual_total=220],
    ['derived supplied as observation',s=>s.observations.push(observation('total_sum_l5',444))],
    ['duplicate ID',s=>s.observations.push(s.observations[0])],
    ['same teams',s=>s.event.participants=['home','home']],
    ['timezone',s=>s.event.timezone='fake/timezone'],
    ['manual input',s=>s.origin='manual'],
    ['unknown variable',s=>s.observations[0].variable='invented'],
    ['wrong unit',s=>s.observations[0].unit='percent'],
    ['numeric string',s=>s.observations[0].value='217'],
    ['missing reason',s=>s.observations[0].value=null],
    ['NaN',s=>s.observations[0].value=NaN],
    ['future availability',s=>s.observations[0].availableAt='2026-02-02T00:00:00.000Z'],
    ['late captured revision',s=>s.observations[0].capturedAt='2026-02-02T00:00:00.000Z'],
    ['publishing after availability',s=>s.observations[0].source.publishedAt='2026-02-01T00:00:00.000Z'],
    ['missing source',s=>delete s.observations[0].source.recordId],
    ['silent origin upgrade',s=>s.origin='observed'],
  ])('rejects %s',(_name,edit)=>{const s=nbaSnapshot();edit(s);expect(()=>validateSnapshot(s,OPTIONS)).toThrow();});
  it('permits zero dispersion but no invented 10-point fallback',()=>{
    const s=nbaSnapshot();
    for(const o of s.observations.filter(o=>o.variable.startsWith('home_')&&o.sample)){
      o.sample.records=o.sample.records.map(r=>({...r,value:220}));
      o.value=o.variable==='home_std'?0:220;
    }
    expect(buildNbaVector(s,OPTIONS).byName.home_std).toBe(0);
  });
  it('keeps explicit missing data but cannot build a model vector',()=>{
    const s=change('home_std',o=>{o.value=null;o.missingReason='provider_unavailable';});
    expect(validateSnapshot(s,OPTIONS)).toBe(true);
    expect(()=>buildNbaVector(s,OPTIONS)).toThrow('MISSING_FEATURE');
  });
  it.each([
    ['insufficient L20',o=>o.sample.records.pop()],
    ['fake average',o=>o.value+=1],
    ['duplicate game',o=>o.sample.records[1]={...o.sample.records[0]}],
    ['history same instant as prediction',o=>o.sample.records[0].endedAt='2026-02-01T10:00:00.000Z'],
    ['reverse chronology',o=>o.sample.records.reverse()],
  ])('rejects %s',(_name,edit)=>expect(()=>buildNbaVector(change('home_total_l20',edit),OPTIONS)).toThrow());
  it('rejects individually valid but inconsistent nested windows',()=>{
    const s=change('home_total_l5',o=>{o.sample.records=o.sample.records.map(r=>({...r,id:'other-'+r.id}));});
    expect(()=>buildNbaVector(s,OPTIONS)).toThrow('INCONSISTENT_WINDOWS');
  });
  it('never falls back from missing home venue history to overall mean',()=>{
    const s=change('home_home_avg',o=>o.sample.records=o.sample.records.map(r=>({...r,venue:'away'})));
    expect(()=>buildNbaVector(s,OPTIONS)).toThrow('MISSING_VENUE_HISTORY');
  });
  it('requires raw values for every clipping transform',()=>expect(()=>buildNbaVector(change('home_rest_days',o=>delete o.rawValue),OPTIONS)).toThrow('INVALID_TRANSFORM'));
  it('uses raw rest difference, not clipped difference',()=>{
    const s=nbaSnapshot();for(const [name,value,raw] of [['home_rest_days',7,12],['away_rest_days',7,9]]){
      Object.assign(s.observations.find(o=>o.variable===name),{value,rawValue:raw});
    }
    s.observations.find(o=>o.variable==='is_b2b_home').value=0;
    s.observations.find(o=>o.variable==='rest_diff').value=3;
    expect(buildNbaVector(s,OPTIONS).byName.total_rest).toBe(14);
    s.observations.find(o=>o.variable==='rest_diff').value=0;
    expect(()=>buildNbaVector(s,OPTIONS)).toThrow('REST_MISMATCH');
  });
  it('rejects wrong participant binding',()=>expect(()=>buildNbaVector(change('home_std',o=>o.entityId='away'),OPTIONS)).toThrow('FEATURE_ENTITY_MISMATCH'));
  it('applies explicit freshness policy relative to prediction cutoff',()=>{
    expect(()=>validateSnapshot(nbaSnapshot(),{...OPTIONS,maxAgeMs:3600000})).toThrow('STALE_OBSERVATION');
    expect(validateSnapshot(nbaSnapshot(),{...OPTIONS,maxAgeMs:86400000})).toBe(true);
  });
  it('does not accept fixtures by default or authenticate a provider via metadata',()=>{
    expect(()=>validateSnapshot(nbaSnapshot(),{now:OPTIONS.now})).toThrow('FIXTURE_FORBIDDEN');
    const s=nbaSnapshot();s.origin='observed';s.observations.forEach(o=>o.source.kind='provider');
    expect(()=>validateSnapshot(s,{now:OPTIONS.now})).toThrow('UNTRUSTED_PROVIDER');
    expect(validateSnapshot(s,{now:OPTIONS.now,trustedProviders:['controlled-fixture']})).toBe(true);
  });
  it.each(['2026-02-30T00:00:00.000Z','2026-01-01','2026-01-01T00:00:00','2026-01-01T00:00:00.000-05:00'])('rejects noncanonical/invalid timestamp %s',x=>expect(()=>utcInstant(x)).toThrow());
  it('separates tennis inputs from context and post-event targets',()=>{
    const s=tennisSnapshot();s.observations.push(observation('tennis.rank',1,'home'));
    const v=tennisPredictors(s,OPTIONS);expect(v.home['tennis.elo_overall']).toBe(1500);
    expect(v.home).not.toHaveProperty('tennis.rank');
    s.observations.push(observation('tennis.winner','home'));expect(()=>tennisPredictors(s,OPTIONS)).toThrow('FORBIDDEN_VARIABLE');
  });
  it('rejects tennis wrong circuit, missing surface and inconsistent counts',()=>{
    const s=tennisSnapshot();s.observations=s.observations.filter(o=>o.variable!=='tennis.surface');
    expect(()=>tennisPredictors(s,OPTIONS)).toThrow('MISSING_FEATURE');
    const t=tennisSnapshot();t.observations.find(o=>o.variable==='tennis.surface_count').value=99;
    expect(()=>tennisPredictors(t,OPTIONS)).toThrow('INCONSISTENT_COUNT');
    t.event.league='NBA';expect(()=>tennisPredictors(t,OPTIONS)).toThrow('UNSUPPORTED_SCOPE');
  });
});
describe('immutable snapshot revisions',()=>{
  it('hashes content stably, freezes deep data and does not alias caller',()=>{
    const input=nbaSnapshot(), saved=sealDataSnapshot(input,OPTIONS);
    const reordered={observations:input.observations,...input};
    expect(sealDataSnapshot(reordered,OPTIONS).hash).toBe(saved.hash);
    input.observations[0].value=999;
    expect(saved.payload.observations[0].value).toBe(217);
    expect(Object.isFrozen(saved.payload.observations[0])).toBe(true);
  });
  it('preserves prior snapshot and requires an explicit revision chain',()=>{
    const old=sealDataSnapshot(nbaSnapshot(),OPTIONS),next=structuredClone(old.payload);
    next.previousHash=old.hash;next.asOf='2026-02-01T11:00:00.000Z';
    const updated=reviseDataSnapshot(old,next,OPTIONS);
    expect(updated.hash).not.toBe(old.hash);expect(old.payload.previousHash).toBeNull();
    next.previousHash='0'.repeat(64);expect(()=>reviseDataSnapshot(old,next,OPTIONS)).toThrow('chain');
  });
  it('rejects changed observation with unchanged source revision and origin laundering',()=>{
    const old=sealDataSnapshot(nbaSnapshot(),OPTIONS),next=structuredClone(old.payload);
    next.previousHash=old.hash;next.asOf='2026-02-01T11:00:00.000Z';
    next.observations.find(o=>o.variable==='altitude_ft').value=20;
    expect(()=>reviseDataSnapshot(old,next,OPTIONS)).toThrow('source revision');
    next.observations.find(o=>o.variable==='altitude_ft').source.revision='2';
    expect(reviseDataSnapshot(old,next,OPTIONS).hash).not.toBe(old.hash);
    next.origin='observed';expect(()=>reviseDataSnapshot(old,next,OPTIONS)).toThrow('origin');
  });
});

describe('post-event targets are never predictors',()=>{
  const pair=()=>{
    const snapshot=nbaSnapshot();snapshot.purpose='training_features';
    const at='2026-02-02T16:00:00.000Z';
    return {snapshot,label:{eventId:'game-1',period:'FULL',variable:'actual_total',value:220,unit:'points',status:'completed',endedAt:at,availableAt:at,capturedAt:at,source:{provider:'controlled-fixture',recordId:'result-1',revision:'1',kind:'fixture',publishedAt:at}},options:{...OPTIONS,now:Date.parse('2026-02-03T00:00:00.000Z')}};
  };
  it('accepts future outcomes only in the separate training label, not the original vector',()=>{
    const {snapshot,label,options}=pair();expect(validateTrainingLabel(snapshot,label,options)).toBe(true);
    expect(buildNbaVector(snapshot,options).byName).not.toHaveProperty('actual_total');
  });
  it.each(['wrong_event','wrong_period','before_start','future_capture','retired','wrong_target','hidden_predictor'])('rejects %s',reason=>{
    const {snapshot,label,options}=pair();
    if(reason==='wrong_event')label.eventId='other';
    if(reason==='wrong_period')label.period='HALF';
    if(reason==='before_start')label.endedAt='2026-02-01T00:00:00.000Z';
    if(reason==='future_capture')label.capturedAt='2026-03-01T00:00:00.000Z';
    if(reason==='retired')label.status='retired';
    if(reason==='wrong_target')label.variable='home_total_l5';
    if(reason==='hidden_predictor')label.features={actual_total:220};
    expect(()=>validateTrainingLabel(snapshot,label,options)).toThrow();
  });
  it('accepts a completed tennis winner only from the right participants',()=>{
    const {label,options}=pair(),snapshot=tennisSnapshot();snapshot.purpose='training_features';
    Object.assign(label,{period:'MATCH',variable:'tennis.winner',unit:'participant_id',value:'home'});
    expect(validateTrainingLabel(snapshot,label,options)).toBe(true);
    label.value='third-player';expect(()=>validateTrainingLabel(snapshot,label,options)).toThrow('LABEL_PARTICIPANT');
  });
});
