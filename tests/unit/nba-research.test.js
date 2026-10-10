import {describe,it,expect} from 'vitest';
import {researchSample,summarizeResearch} from '../../src/lib/nba/research-demo.js';
describe('Descriptive research sample',()=>{
  it('counts equality separately and does not turn it into a loss',()=>{
    expect(summarizeResearch([{total:219},{total:220},{total:221}],220)).toEqual({n:3,mean:220,over:1,under:1,push:1,minimum:219,maximum:221});
  });
  it('filters local games before selecting the last N',()=>{
    const history=[{id:1,venue:'home'},{id:2,venue:'away'},{id:3,venue:'home'},{id:4,venue:'away'}];
    expect(researchSample(history,2,'home').map(r=>r.id)).toEqual([1,3]);
  });
  it('reports missing observations without fabricating a zero average',()=>{
    expect(summarizeResearch([],220)).toMatchObject({n:0,mean:null,minimum:null,maximum:null});
  });
});
