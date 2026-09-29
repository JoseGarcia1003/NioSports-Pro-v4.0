// @vitest-environment node
import { describe,it,expect,vi } from 'vitest';
import { analyzeSnapshot } from '../../src/lib/server/prediction-pipeline.js';
import { requestPrediction } from '../../src/lib/server/prediction-service.js';
import { ARCHITECTURE_VERSION as version } from '../../src/lib/prediction/contracts.js';
import { present } from '../../src/lib/prediction/presentation.js';
import { recordOutcome } from '../../src/lib/prediction/results.js';
import { NBA_FEATURES,DATA_DICTIONARY } from '../../src/lib/data/contract.js';
import { nbaSnapshot,OPTIONS } from '../fixtures/data-contract.js';
import { demoDataset } from '../../src/lib/tennis/demo.js';
import { analyzeMatch } from '../../src/lib/tennis/domain.js';
import { remoteProjection } from '../../src/lib/server/remote-projection.js';
const market={eventId:'game-1',period:'FULL',line:220};
const fixtureModels=()=>{
  const base={schemaVersion:version,artifactHash:'a'.repeat(64),sport:'basketball',period:'FULL',
    dataContractVersion:'1.0.0',featureRecipeVersion:DATA_DICTIONARY.featureRecipeVersion,validation:'fixture'};
  return {projection:{manifest:{...base,id:'points-fixture',stage:'projection',featureNames:NBA_FEATURES.map(f=>f.name)},run:vi.fn(async()=>({mean:225}))},
    probability:{manifest:{...base,id:'distribution-fixture',stage:'probability',projectionModelId:'points-fixture'},run:vi.fn(async()=>({over:.6,under:.35,push:.05}))}};
};
const run=(models=fixtureModels(),snapshot=nbaSnapshot(),patch={})=>analyzeSnapshot(snapshot,{models,market,dataOptions:OPTIONS,...patch});
describe('five-stage architecture',()=>{
  it('links data, projection and probability without minting a pick or EV',async()=>{
    const models=fixtureModels(),output=await run(models);
    expect(output.status).toBe('experimental');
    expect(output.projection.value).toEqual({mean:225});
    expect(output.probability.value.outcomes).toEqual({over:.6,under:.35,push:.05});
    expect(output.probability.snapshotHash).toBe(output.projection.snapshotHash);
    expect(output.decision).toMatchObject({status:'abstained',pick:null,ev:null,stake:null});
    expect(models.projection.run).toHaveBeenCalledWith(expect.any(Array));
    expect(models.projection.run.mock.calls[0][0]).toHaveLength(26);
    expect(models.probability.run).toHaveBeenCalledWith({mean:225},220);
  });
  it('fails closed without a registered model; no default mean or probability',async()=>{
    expect(await run({})).toMatchObject({status:'abstained',reason:'MODEL_UNAVAILABLE',projection:null,probability:null});
  });
  it.each(['period','recipe','names','hash','version'])('rejects incompatible artifact %s',async kind=>{
    const models=fixtureModels(),m=models.projection.manifest;
    if(kind==='period')m.period='Q1';if(kind==='recipe')m.featureRecipeVersion='other';
    if(kind==='names')m.featureNames.reverse();if(kind==='hash')m.artifactHash='missing';if(kind==='version')m.schemaVersion='old';
    const out=await run(models);expect(out.status).toBe('abstained');expect(models.projection.run).not.toHaveBeenCalled();
  });
  it.each(['future','missing','target','partial'])('rejects data %s before running models',async kind=>{
    const s=nbaSnapshot(),models=fixtureModels();
    if(kind==='future')s.observations[0].availableAt='2027-01-01T00:00:00.000Z';
    if(kind==='missing')s.observations=[];if(kind==='target')s.actual_total=222;if(kind==='partial')s.event.period='HALF';
    expect((await run(models,s)).status).toBe('abstained');expect(models.projection.run).not.toHaveBeenCalled();
  });
  it('does not replace a failed projection with another model',async()=>{
    const models=fixtureModels();models.projection.run.mockRejectedValue(new Error('private details'));
    const out=await run(models);expect(out.reason).toBe('MODEL_EXECUTION_FAILED');expect(JSON.stringify(out)).not.toContain('private details');
    expect(models.probability.run).not.toHaveBeenCalled();
  });
  it.each([NaN,Infinity,-1])('rejects invalid projected mean %s',async mean=>{
    const models=fixtureModels();models.projection.run.mockResolvedValue({mean});
    expect((await run(models)).reason).toBe('INVALID_PROJECTION');
  });
  it.each([{over:.7,under:.4,push:0},{over:NaN,under:.4,push:0},{over:1.1,under:-.1,push:0},{over:.6,under:.4}])('rejects invalid distribution %j',async value=>{
    const models=fixtureModels();models.probability.run.mockResolvedValue(value);
    expect(await run(models)).toMatchObject({reason:'INVALID_PROBABILITIES',probability:null,recommendation:null});
  });
  it('requires a matching market and forbids push on a fractional line',async()=>{
    expect((await run(undefined,undefined,{market:{...market,eventId:'other'}})).reason).toBe('MARKET_REQUIRED');
    expect((await run(undefined,undefined,{market:{...market,line:220.5}})).reason).toBe('IMPOSSIBLE_PUSH');
  });
  it('requires the distribution to name its projection model',async()=>{
    const models=fixtureModels();models.probability.manifest.projectionModelId='other';
    expect((await run(models)).reason).toBe('PROBABILITY_MODEL_MISMATCH');
  });
  it('preserves projection on distribution failure without inventing probability',async()=>{
    const models=fixtureModels();models.probability.run.mockRejectedValue(new Error('timeout'));
    expect(await run(models)).toMatchObject({status:'experimental',probability:null,projection:{value:{mean:225}}});
  });
  it('presentation copies evidence without recalculating or aliasing it',()=>{
    const projection={value:{mean:225}},out=present({projection});projection.value.mean=1;
    expect(out.projection.value.mean).toBe(225);expect(out.probability).toBeNull();expect(Object.isFrozen(out.projection.value)).toBe(true);
  });
  it('separates recorded outcomes from inference and does not mutate snapshots',()=>{
    const s=nbaSnapshot();const before=structuredClone(s);
    const at='2026-02-02T16:00:00.000Z';
    const result=recordOutcome(s,{eventId:'game-1',period:'FULL',variable:'actual_total',value:220,unit:'points',status:'completed',endedAt:at,availableAt:at,capturedAt:at,
      source:{provider:'fixture',recordId:'r',revision:'1',kind:'fixture',publishedAt:at}},{...OPTIONS,now:Date.parse('2026-02-03')});
    expect(result.stage).toBe('result');expect(s).toEqual(before);expect(result).not.toHaveProperty('probability');
  });
});
describe('remote projection transport',()=>{
  const context={snapshotHash:'b'.repeat(64),event:{id:'game-1',period:'FULL'}};
  it('sends only the projection receipt and features, never line or odds',async()=>{
    const manifest=fixtureModels().projection.manifest;
    const fetcher=vi.fn(async()=>({ok:true,json:async()=>({version,stage:'projection',modelId:manifest.id,
      artifactHash:manifest.artifactHash,validation:manifest.validation,snapshotHash:context.snapshotHash,eventId:'game-1',period:'FULL',value:{mean:225}})}));
    const remote=remoteProjection(context,manifest,{url:'https://fixture.invalid',key:'test-key',fetcher});
    expect(await remote.run([1,2])).toEqual({mean:225});
    const body=JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.snapshotHash).toBe(context.snapshotHash);expect(body).not.toHaveProperty('line');expect(body).not.toHaveProperty('odds');
  });
  it.each(['failure','different_snapshot','different_model'])('rejects %s without fallback',async kind=>{
    const manifest=fixtureModels().projection.manifest;
    const fetcher=vi.fn(async()=>({ok:kind!=='failure',json:async()=>({version,stage:'projection',modelId:kind==='different_model'?'other':manifest.id,
      artifactHash:manifest.artifactHash,validation:manifest.validation,snapshotHash:kind==='different_snapshot'?'c'.repeat(64):context.snapshotHash,eventId:'game-1',period:'FULL',value:{mean:225}})}));
    await expect(remoteProjection(context,manifest,{url:'https://fixture.invalid',key:'test-key',fetcher}).run([])).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
describe('server-owned snapshot resolver',()=>{
  it('rejects legacy values and client attempts to supply trust or models',async()=>{
    const loadSnapshot=vi.fn();
    for(const body of [{homeTeam:{}},{version,snapshotId:'one',dataOptions:{allowFixtures:true}},{version,snapshotId:'one',snapshot:nbaSnapshot()}]){
      expect((await requestPrediction(body,{loadSnapshot})).reason).toBe('DATA_CONTRACT_REQUIRED');
    }
    expect(loadSnapshot).not.toHaveBeenCalled();
  });
  it('resolves trusted data before executing the same pipeline',async()=>{
    const loadSnapshot=vi.fn(async()=>nbaSnapshot());
    const result=await requestPrediction({version,snapshotId:'one',market},{loadSnapshot,models:fixtureModels(),dataOptions:OPTIONS});
    expect(loadSnapshot).toHaveBeenCalledWith('one');expect(result.projection.value.mean).toBe(225);
  });
  it('does not promote user snapshots or register production models implicitly',async()=>{
    expect((await requestPrediction({version,snapshotId:'one'})).reason).toBe('SNAPSHOT_UNAVAILABLE');
  });
  it('keeps observed legacy tennis data as context instead of certifying its ratings',()=>{
    const now=Date.parse('2026-09-28T10:00:00Z'),data=demoDataset(now);data.isDemo=false;
    expect(analyzeMatch(data,data.matches[0],now)).toMatchObject({status:'abstained',probabilityA:null});
  });
});
