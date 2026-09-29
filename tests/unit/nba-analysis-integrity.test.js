// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: vi.fn() }));
import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
import { generateAIPicks, getPicksSummary, groupPicksByGame } from '../../src/lib/services/ai-picks-generator.js';
import { pickKey, resultUpdate, savedAnalysis } from '../../src/routes/picks/pick-actions.js';

const stats = { Lakers: { fullHome: 115 }, Celtics: { fullAway: 112 } };
const game = (patch = {}) => ({ id: 'nba-1', homeTeam: 'Lakers', awayTeam: 'Celtics', status: 'Scheduled', lines: { FULL: 220 }, ...patch });
const forecast = (patch = {}) => ({ line: 220, period: 'FULL', projection: 225, edge: 5, direction: 'OVER', probability: .6,
  probabilityPercent: 60, confidence: 'MEDIUM', evPercent: 999, modelVersion: 'server-model-3', ...patch });
const respond = (patch = {}) => authenticatedFetch.mockResolvedValue({ ok: true, json: async () => forecast(patch) });
const run = (rows = [game()], options = {}) => generateAIPicks(rows, stats, { periods: ['FULL'], ...options });

beforeEach(() => { vi.clearAllMocks(); respond(); });

describe('NBA server-owned analysis integrity', () => {
  it('never promotes legacy averages into a snapshot', async () => {
    await expect(run()).rejects.toThrow('instantánea');
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });
  it('requests a versioned snapshot and never recalculates EV from a projection', async () => {
    authenticatedFetch.mockResolvedValue({ok:true,json:async()=>({version:'prediction-chain-1',status:'experimental',recommendation:null,message:'Política no habilitada',projection:{value:{mean:225}}})});
    await expect(run([game({snapshotId:'snapshot-1'})])).rejects.toThrow('Política no habilitada');
    expect(JSON.parse(authenticatedFetch.mock.calls[0][1].body)).toEqual({version:'prediction-chain-1',snapshotId:'snapshot-1',market:{eventId:'nba-1',period:'FULL',line:220}});
  });
  it.each([{isLive:true},{isFinal:true},{isDemo:true},{status:'Postponed'},{status:'Final'},{homeScore:1},{awayScore:1},{startAt:'2020-01-01T00:00:00Z'},{startAt:'invalid'},{homeTeam:' Celtics '},{id:null},{lines:{FULL:'220'}}])('does not request ineligible games %j',async patch=>{
    expect(await run([game(patch)])).toEqual([]);expect(authenticatedFetch).not.toHaveBeenCalled();
  });
  it('does not request unsupported periods',async()=>{
    expect(await run([game({snapshotId:'one'})],{periods:['HALF','Q1']})).toEqual([]);expect(authenticatedFetch).not.toHaveBeenCalled();
  });
  it('rejects old flat responses rather than interpreting them as the new chain',async()=>{
    await expect(run([game({snapshotId:'one'})])).rejects.toThrow('inconsistente');
  });
  it('retains quota errors',async()=>{
    authenticatedFetch.mockResolvedValue({ok:false,status:429});
    await expect(run([game({snapshotId:'one'})])).rejects.toThrow('límite');
  });
  it('cancels pending analysis even when the fetch implementation ignores cancellation',async()=>{
    const controller=new AbortController();let resolve;
    authenticatedFetch.mockReturnValue(new Promise(done=>{resolve=done;}));
    const pending=run([game({snapshotId:'one'})],{signal:controller.signal});controller.abort();
    resolve({ok:true,json:async()=>forecast()});
    await expect(pending).rejects.toMatchObject({name:'AbortError'});
  });
  it('does not request when already aborted',async()=>{
    const controller=new AbortController();controller.abort();
    await expect(run(undefined,{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });
  it('preserves personal summary and event identity helpers',()=>{
    expect(groupPicksByGame([{...game(),gameId:'one'},{...game(),gameId:'two'}])).toHaveLength(2);
    expect(getPicksSummary([{evPercent:null,edge:5},{evPercent:10,edge:3}])).toMatchObject({avgEV:10,priced:1,avgEdge:4});
  });
});

describe('NBA personal tracking integrity', () => {
  it('does not save invented odds or overwrite the model version', () => {
    expect(savedAnalysis({ ...forecast(), ...game(), odds: null, evPercent: null }, 'owner')).toMatchObject({ odds: null, ev: null, model_version: 'server-model-3', user_id: 'owner' });
  });
  it('uses game and market identity to distinguish saves on different dates or lines', () => {
    const pick = { ...forecast(), homeTeam: 'Lakers', awayTeam: 'Celtics', gameId: 'game-1' };
    expect(pickKey(pick)).not.toBe(pickKey({ ...pick, gameId: 'game-2' }));
    expect(pickKey(pick)).not.toBe(pickKey({ ...pick, line: 222 }));
  });
  it('validates an entered period score against the chosen result', () => {
    expect(resultUpdate(forecast(), 'win', 221)).toMatchObject({ result: 'win', actual_total: 221 });
    expect(resultUpdate(forecast(), 'push', 220)).toMatchObject({ result: 'push', actual_total: 220 });
    expect(resultUpdate(forecast({ direction: 'UNDER' }), 'win', 0)).toMatchObject({ actual_total: 0 });
    expect(() => resultUpdate(forecast(), 'loss', 221)).toThrow('ganado');
  });
  it.each([-1, 220.5, 'bad', Infinity])('rejects invalid scores rather than truncating them: %s', score => {
    expect(() => resultUpdate(forecast(), 'win', score)).toThrow('total entero');
  });
  it('allows an explicit personal result without claiming a verified score', () => {
    expect(resultUpdate(forecast(), 'loss', '')).toMatchObject({ actual_total: null });
  });
  it('clears a previous total when a result is corrected without a new score', () => {
    const previous = { ...forecast(), status: 'win', actual_total: 221 };
    const corrected = { ...previous, ...resultUpdate(previous, 'loss', '') };
    expect(corrected).toMatchObject({ status: 'loss', result: 'loss', actual_total: null });
  });
});
