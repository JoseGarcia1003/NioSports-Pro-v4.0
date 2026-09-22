import { describe, it, expect, vi } from 'vitest';
import { predictionInputError } from '../../src/lib/server/prediction-input.js';
import { buildMLInput } from '../../src/lib/server/ml-input.js';
vi.mock('$lib/services/authenticated-fetch.js', () => ({authenticatedFetch:vi.fn()}));
import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';
import { generateAIPicks } from '../../src/lib/services/ai-picks-generator.js';
const input = () => ({homeTeam:{name:'Lakers',stats:{fullHome:115}},awayTeam:{name:'Celtics',stats:{fullAway:112}},period:'FULL',line:220});
describe('Prediction data integrity', () => {
  it('accepts complete venue averages', () => expect(predictionInputError(input())).toBeNull());
  it.each([null, {}, {line:0}, {line:'220'}, {line:NaN}, {period:'Q5'}, {homeTeam:{name:'Lakers',stats:{}}}, {homeTeam:{name:'Lakers',stats:{fullHome:115,fullLast5:-5}}}])('abstains on invalid input %j', patch => {
    const body = patch === null ? null : {...input(),...patch};
    if (patch && Object.keys(patch).length === 0) body.homeTeam.stats = {};
    expect(predictionInputError(body)).toBeTruthy();
  });
  it('rejects identical teams', () => {const body=input();body.awayTeam.name=' Lakers ';expect(predictionInputError(body)).toBeTruthy();});
  it('does not synthesize ML history from a venue average', () => expect(buildMLInput(input())).toBeNull());
  it('passes distinct real feature windows without substitution', () => {
    const body=input();body.gameInfo={daysIntoSeason:20};
    for(const team of [body.homeTeam,body.awayTeam]) {team.restDays=0;team.stats.ml={total_l5:225,total_l10:224,total_l20:223,home_avg:226,away_avg:221,std:12};}
    expect(buildMLInput(body).home_team).toMatchObject({total_l5:225,total_l10:224,total_l20:223,is_b2b:true,rest_days:0});
    delete body.homeTeam.stats.ml.std;
    expect(buildMLInput(body)).toBeNull();
  });
  it('does not generate automatic picks without market lines or from demos', async () => {
    const stats={Lakers:{fullHome:115},Celtics:{fullAway:112}};
    expect(await generateAIPicks([{homeTeam:'Lakers',awayTeam:'Celtics',lines:{}}],stats)).toEqual([]);
    expect(await generateAIPicks([{homeTeam:'Lakers',awayTeam:'Celtics',isDemo:true,lines:{FULL:220}}],stats)).toEqual([]);
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });
});
