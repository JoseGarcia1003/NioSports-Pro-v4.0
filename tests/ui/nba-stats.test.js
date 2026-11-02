import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: fetchMock }));
import NbaStatsLeaders from '../../src/lib/components/NbaStatsLeaders.svelte';
import NbaStandings from '../../src/lib/components/NbaStandings.svelte';
import { resetNbaSeason } from '../../src/lib/stores/nba-season.js';
import { playerRow, teamRows, standings } from '../../src/lib/nba/season.js';

const p = (id, name, team, gp, totals) => playerRow({ player_id: id, player_name: name, team, gp, w: 0, l: 0, min: 30 * gp, pts: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, reb: 0, ast: 0, tov: 0, stl: 0, blk: 0, pf: 0, plus_minus: 0, ...totals });
const g = (team, opponent, pts, opp_pts, game_date, is_home = true) => ({ team, opponent, pts, opp_pts, game_date, is_home, game_id: game_date + team, fgm: 40, fga: 85, fg3m: 12, fg3a: 34, ftm: 18, fta: 22, oreb: 10, dreb: 33, reb: 43, ast: 25, tov: 13, stl: 8, blk: 5, pf: 19 });
const games = [g('MEM', 'HOU', 121, 110, '2026-10-30'), g('HOU', 'MEM', 110, 121, '2026-10-30', false), g('BOS', 'PHI', 115, 101, '2026-10-29'), g('PHI', 'BOS', 101, 115, '2026-10-29', false)];
const body = {
  season: '2026-27', seasons: ['2026-27', '2025-26'], through: '2026-10-31',
  players: [
    p(1, 'Luka Dončić', 'LAL', 6, { pts: 226, reb: 49, ast: 44, fgm: 68, fga: 141 }),
    p(2, 'Domantas Sabonis', 'SAC', 6, { pts: 96, reb: 95, ast: 44, fgm: 38, fga: 55 }),
    p(3, 'Trae Young', 'WAS', 6, { pts: 124, reb: 22, ast: 61, fgm: 32, fga: 82 }),
    p(4, 'Uno de uno', 'BOS', 1, { pts: 2, fgm: 1, fga: 1 })
  ],
  teams: teamRows(games), standings: standings(games)
};
beforeEach(() => { resetNbaSeason(); fetchMock.mockResolvedValue(new Response(JSON.stringify(body))); });
afterEach(() => { cleanup(); fetchMock.mockReset(); });

const firstNames = screen => [...screen.container.querySelectorAll('tbody th.name')].map(th => th.textContent.trim());

describe('Estadísticas', () => {
  it('ranks players by points and re-sorts when a column is clicked', async () => {
    const screen = render(NbaStatsLeaders);
    await waitFor(() => expect(firstNames(screen)[0]).toBe('Luka Dončić'));
    await fireEvent.click(screen.getAllByRole('button', { name: 'REB' })[0]);
    expect(firstNames(screen)[0]).toBe('Domantas Sabonis');
    expect(screen.container.querySelector('th[aria-sort="descending"]').textContent).toContain('REB');
    await fireEvent.click(screen.getAllByRole('button', { name: /^AST/ })[0]);
    expect(firstNames(screen)[0]).toBe('Trae Young');
  });
  it('requires volume for percentages so 1-for-1 does not lead', async () => {
    const screen = render(NbaStatsLeaders);
    await waitFor(() => expect(firstNames(screen).length).toBe(4));
    await fireEvent.click(screen.getAllByRole('button', { name: 'FG%' })[0]);
    expect(firstNames(screen)).not.toContain('Uno de uno');
    expect(firstNames(screen)[0]).toBe('Domantas Sabonis');
    expect(document.body.textContent).toContain('Mínimo 3 tiros de campo intentados por partido');
  });
  it('switches to team statistics', async () => {
    const screen = render(NbaStatsLeaders);
    await waitFor(() => expect(firstNames(screen).length).toBe(4));
    await fireEvent.click(screen.getByRole('tab', { name: 'Equipos' }));
    // Boston and Memphis are both 1-0: equal win % ties break alphabetically.
    expect(firstNames(screen).slice(0, 2).map(n => n.slice(3))).toEqual(['Boston Celtics', 'Memphis Grizzlies']);
  });
  it('says so when the data is unavailable', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 503 }));
    const screen = render(NbaStatsLeaders);
    await waitFor(() => expect(screen.getByText(/No pudimos cargar las estadísticas/)).toBeTruthy());
  });
});

describe('Clasificación', () => {
  it('shows both conferences in order with records', async () => {
    const screen = render(NbaStandings);
    const west = await screen.findByRole('region', { name: 'Conferencia Oeste' });
    expect(west.textContent).toMatch(/MEM.*HOU/s);
    expect(screen.getByRole('region', { name: 'Conferencia Este' }).textContent).toMatch(/BOS.*PHI/s);
    await fireEvent.click(screen.getByRole('button', { name: 'Este' }));
    expect(screen.queryByRole('region', { name: 'Conferencia Oeste' })).toBeNull();
  });
});
