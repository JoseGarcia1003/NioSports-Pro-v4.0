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

describe('NBA automatic analysis integrity', () => {
  it('awaits the server and preserves its model identity without fictional context or odds', async () => {
    let resolve;
    authenticatedFetch.mockReturnValue(new Promise(done => { resolve = done; }));
    const pending = run();
    resolve({ ok: true, json: async () => forecast() });
    const [pick] = await pending;
    const body = JSON.parse(authenticatedFetch.mock.calls[0][1].body);
    expect(body.homeTeam).toEqual({ name: 'Lakers', stats: stats.Lakers });
    expect(body.awayTeam).toEqual({ name: 'Celtics', stats: stats.Celtics });
    expect(body.gameInfo).toEqual({});
    expect(pick).toMatchObject({ modelVersion: 'server-model-3', odds: null, ev: null, evPercent: null, isValueBet: false });
    expect(pick.missingContext).toHaveLength(3);
  });
  it('preserves reported zero rest days, explicit injury information and actual arena', async () => {
    const [pick] = await run([game({ context: { home: { restDays: 0, injuries: [{ name: 'A Player', type: 'starter' }] }, away: { restDays: 4, injuries: [] } }, arena: 'Neutral site' })]);
    const body = JSON.parse(authenticatedFetch.mock.calls[0][1].body);
    expect(body.homeTeam.restDays).toBe(0);
    expect(body.homeTeam.injuries).toEqual([{ name: 'A Player', type: 'starter' }]);
    expect(body.gameInfo.arena).toBe('Neutral site');
    expect(pick.missingContext).toEqual(['Cuota no disponible: EV sin calcular']);
  });
  it.each([{ isLive: true }, { isFinal: true }, { isDemo: true }, { status: 'Postponed' }, { status: 'Final' }, { homeScore: 1 }, { awayScore: 1 }, { startAt: '2020-01-01T00:00:00Z' }, { startAt: 'invalid' }, { homeTeam: ' Celtics ' }, { id: null }, { lines: { FULL: '220' } }])('does not analyze ineligible games %j', async patch => {
    expect(await run([game(patch)])).toEqual([]);
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });
  it('does not spend requests on incomplete or invalid period statistics', async () => {
    expect(await generateAIPicks([game()], { Lakers: {}, Celtics: stats.Celtics })).toEqual([]);
    expect(await generateAIPicks([game()], { Lakers: { fullHome: 115, fullLast5: -1 }, Celtics: stats.Celtics })).toEqual([]);
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });
  it('recomputes expected value from the actual selected-direction price', async () => {
    const [pick] = await run([game({ odds: { FULL: { OVER: 100, UNDER: -250 } } })]);
    expect(pick).toMatchObject({ odds: 100, evPercent: 20, isValueBet: true });
  });
  it('rejects negative expected value even when point difference is large', async () => {
    expect(await run([game({ odds: { FULL: { OVER: -300 } } })])).toEqual([]);
  });
  it.each([{ line: 221 }, { edge: 25 }, { probability: 3 }, { projection: NaN }, { period: 'Q1' }, { direction: 'UNDER' }, { modelVersion: null }, { confidence: 'CERTAIN' }])('rejects inconsistent API results %j', async patch => {
    respond(patch);
    await expect(run()).rejects.toThrow('inconsistente');
  });
  it('stops immediately on quota failure instead of labelling it as no value', async () => {
    authenticatedFetch.mockResolvedValue({ ok: false, status: 429 });
    await expect(run([game(), game({ id: 'nba-2' })])).rejects.toThrow('límite');
    expect(authenticatedFetch).toHaveBeenCalledTimes(1);
  });
  it('cancels a pending generation without starting the next game even when fetch ignores cancellation', async () => {
    const controller = new AbortController();
    let resolve;
    authenticatedFetch.mockReturnValue(new Promise(done => { resolve = done; }));
    const result = run([game(), game({ id: 'nba-2' })], { signal: controller.signal });
    controller.abort();
    resolve({ ok: true, json: async () => forecast() });
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(authenticatedFetch).toHaveBeenCalledTimes(1);
    expect(authenticatedFetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('does not call the API for an already canceled task', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(run(undefined, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });
  it('deduplicates games and periods before consuming quota', async () => {
    expect(await run([game(), game()], { periods: ['FULL', 'FULL', 'Q9'] })).toHaveLength(1);
    expect(authenticatedFetch).toHaveBeenCalledTimes(1);
  });
  it('does not mix separate fixtures between the same teams', () => {
    expect(groupPicksByGame([{ ...game(), gameId: 'one' }, { ...game(), gameId: 'two' }])).toHaveLength(2);
  });
  it('distinguishes unpriced analyses from zero expected value in summaries', () => {
    expect(getPicksSummary([{ evPercent: null, edge: 5 }, { evPercent: 10, edge: 3 }])).toMatchObject({ avgEV: 10, priced: 1, avgEdge: 4 });
    expect(getPicksSummary([]).avgEV).toBeNull();
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
