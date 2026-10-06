// @vitest-environment node
import { describe,it,expect,vi } from 'vitest';
import { readFileSync,existsSync } from 'node:fs';
import { execFileSync,spawnSync } from 'node:child_process';
import { totalOutcomes,eloOutcomes,fixtureTotalDistribution,PROBABILITY_VERSION } from '../../src/lib/prediction/distribution.js';
import { probabilities } from '../../src/lib/prediction/probability.js';
import { ARCHITECTURE_VERSION as version,stageRecord } from '../../src/lib/prediction/contracts.js';
import { requestPrediction } from '../../src/lib/server/prediction-service.js';
import { NBA_FEATURES,DATA_DICTIONARY } from '../../src/lib/data/contract.js';
import { nbaSnapshot,OPTIONS } from '../fixtures/data-contract.js';
const vectors=JSON.parse(readFileSync(new URL('../fixtures/probability-vectors.json',import.meta.url),'utf8'));
const points=vectors.cases[0].points;
const context={event:{id:'game-1',sport:'basketball',period:'FULL'},origin:'fixture',snapshotHash:'b'.repeat(64),
  asOf:'2026-01-01T00:00:00Z',dataContractVersion:'1.0.0',featureRecipeVersion:DATA_DICTIONARY.featureRecipeVersion};
const manifest={schemaVersion:version,id:'fixture-projection',stage:'projection',artifactHash:'a'.repeat(64),validation:'fixture',
  sport:'basketball',period:'FULL',dataContractVersion:'1.0.0',featureRecipeVersion:DATA_DICTIONARY.featureRecipeVersion,
  featureNames:NBA_FEATURES.map(f=>f.name)};
const projection=()=>stageRecord(context,'projection',manifest,{mean:213});
const model=()=>fixtureTotalDistribution(context,manifest,points,'c'.repeat(64));
const market={eventId:'game-1',period:'FULL',line:210};
describe('shared event probability contract',()=>{
  it.each(vectors.cases)('$id matches a known outcome',c=>{
    const result=c.kind==='total'?totalOutcomes(c.points,c.line):eloOutcomes(c.a,c.b);
    for(const key of Object.keys(c.expected))expect(result[key]).toBeCloseTo(c.expected[key],12);
  });
  it('Python and JS produce the same vectors, not just the same schema',()=>{
    const python=existsSync('.venv-phase4/Scripts/python.exe')?'.venv-phase4/Scripts/python.exe':process.platform==='win32'?'python':'python3';
    const output=JSON.parse(execFileSync(python,['-m','ml.contracts.probability'],{encoding:'utf8'}));
    for(const c of vectors.cases){const js=c.kind==='total'?totalOutcomes(c.points,c.line):eloOutcomes(c.a,c.b);
      for(const key of Object.keys(js))expect(output[c.id][key]).toBeCloseTo(js[key],12);}
  });
  it('over decreases and under increases without losing push mass',()=>{
    let last={over:1,under:0};
    for(let line=199.5;line<=220.5;line+=.5){const p=totalOutcomes(points,line);
      expect(p.over).toBeLessThanOrEqual(last.over);expect(p.under).toBeGreaterThanOrEqual(last.under);
      expect(p.over+p.under+p.push).toBeCloseTo(1,12);last=p;}
  });
  it('sum tolerance never allows an individual probability greater than one',()=>{
    expect(()=>totalOutcomes([{total:2,mass:.5},{total:3,mass:.50000000001}],1)).toThrow('INCOMPLETE_PROBABILITY_MASS');
  });
  it.each([210.25,NaN,Infinity,0,-1,'210',true])('rejects ambiguous/invalid total line %s',line=>{
    expect(()=>totalOutcomes(points,line)).toThrow('UNSUPPORTED_TOTAL_LINE');
  });
  it.each([[],[{total:2,mass:.9}],[{total:2,mass:1},{total:2,mass:0}],
    [{total:-1,mass:1}],[{total:2.5,mass:1}],[{total:2,mass:NaN}],[{total:2,mass:-1}],
    [{total:2,mass:1,extra:1}]])('rejects invalid or incomplete PMF %j',pmf=>{
    expect(()=>totalOutcomes(pmf,210)).toThrow();
  });
  it('rejects observed use of fixture artifacts and incoherent mean',()=>{
    expect(()=>fixtureTotalDistribution({...context,origin:'observed'},manifest,points,'c'.repeat(64))).toThrow('FIXTURE_MODEL_FORBIDDEN');
    expect(()=>model().run({mean:220},210)).toThrow('DISTRIBUTION_MEAN_MISMATCH');
  });
  it('records event line cut data/model hashes and semantics without odds',async()=>{
    const p=await probabilities(context,projection(),market,model());
    expect(p).toMatchObject({eventId:'game-1',period:'FULL',asOf:context.asOf,snapshotHash:context.snapshotHash,
      value:{contractVersion:PROBABILITY_VERSION,target:'total_points_including_overtime',line:210,
        outcomes:{over:.5,under:.2,push:.3},conditionalOn:'completed_with_overtime',calibrated:false,
        projectionArtifactHash:manifest.artifactHash}});
    expect(await probabilities(context,projection(),{...market,odds:1.1},model())).toEqual(p);
  });
  it('blocks mismatched projection weights even with same model name',async()=>{
    const m=model();m.manifest.projectionArtifactHash='d'.repeat(64);
    await expect(probabilities(context,projection(),market,m)).rejects.toThrow('PROBABILITY_MODEL_MISMATCH');
  });
  it('does not multiply dependent markets hidden inside a request',async()=>{
    await expect(probabilities(context,projection(),{...market,legs:[{period:'HALF'}]},model())).rejects.toThrow('UNSUPPORTED_MARKET');
  });
  it('binds tennis outcomes to participant identities and rejects a totals line',async()=>{
    const c={...context,event:{id:'tennis-1',sport:'tennis',period:'MATCH',participants:['player-a','player-b']}};
    const m={...manifest,sport:'tennis',period:'MATCH'};
    const p=stageRecord(c,'projection',m,{ratingA:1500,ratingB:1500});
    const adapter={manifest:{...m,stage:'probability',id:'elo-fixture',projectionModelId:m.id,projectionArtifactHash:m.artifactHash,
      probabilityContractVersion:PROBABILITY_VERSION,method:'elo-400-1'},run:v=>eloOutcomes(v.ratingA,v.ratingB)};
    const out=await probabilities(c,p,null,adapter);
    expect(out.value).toMatchObject({outcomeEntities:{a:'player-a',b:'player-b'},conditionalOn:'completed_without_retirement',line:null,outcomes:{a:.5,b:.5}});
    await expect(probabilities(c,p,{eventId:'tennis-1',period:'MATCH',line:20},adapter)).rejects.toThrow('MARKET_REQUIRED');
  });
  it.each(['HALF','Q1','Q2'])('never rescales FULL to %s',async period=>{
    const c={...context,event:{...context.event,period}};
    await expect(probabilities(c,stageRecord(c,'projection',manifest,{mean:213}),{...market,period},model())).rejects.toThrow('UNSUPPORTED_SCOPE');
  });
  it('rejects old contract and a receipt for another cutoff',async()=>{
    const m=model();delete m.manifest.probabilityContractVersion;
    await expect(probabilities(context,projection(),market,m)).rejects.toThrow('PROBABILITY_CONTRACT_REQUIRED');
    await expect(probabilities({...context,asOf:'2026-01-02T00:00:00Z'},projection(),market,model())).rejects.toThrow('STAGE_CONTEXT_MISMATCH');
  });
  it('serves the same distribution through the API service pipeline',async()=>{
    const out=await requestPrediction({version,snapshotId:'fixture',market},{loadSnapshot:async()=>nbaSnapshot(),dataOptions:OPTIONS,
      models:{projection:{manifest,run:async()=>({mean:213})},probability:model()}});
    expect(out.probability.value.outcomes).toEqual(totalOutcomes(points,210));
    expect(out.calibrated).toBe(false);expect(out.recommendation).toBeNull();
    expect(out.decision.status).toBe('abstained');
  });
  it('quarantines legacy backtest before network or output files',()=>{
    const path='static/data/backtesting-results.json';const before=existsSync(path)?readFileSync(path,'utf8'):null;
    const result=spawnSync(process.execPath,['scripts/backtesting-runner.js'],{encoding:'utf8'});
    expect(result.status).not.toBe(0);expect(result.stderr).toContain('LEGACY_BACKTEST_QUARANTINED');
    expect(existsSync(path)?readFileSync(path,'utf8'):null).toBe(before);
  });
});
