import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/svelte';
// The board calls the APIs with the user's session; tests route it to the stubbed fetch.
vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: (url, options) => fetch(url, options) }));
import NbaPropsBoard from '../../src/lib/components/NbaPropsBoard.svelte';

// newest first: [date, opp, home, min, pts, reb, ast, fg3m, season, team]
const g = (pts, fg3m = 2, season = '2026-27') => ['2026-10-30', 'CHI', true, 34, pts, 6, 5, fg3m, season, 'BOS'];
const payload = {
  day: '2026-11-01', statsThrough: '2026-10-30',
  games: [{ id: 1, datetime: '2026-11-01T20:30:00Z', home: 'ORL', visitor: 'BOS' }],
  players: [{ id: 7, name: 'Jayson Tatum', team: 'BOS', opp: 'ORL', home: false, gameId: 1, minutesL5: 36, games: [g(30, 3), g(28, 1), g(10, 0), g(26, 2), g(24, 4), g(20, 2, '2025-26')] }]
};
const respond = (body, status = 200) => vi.fn(async url => String(url).includes('/api/odds/') ? new Response('{}', { status: 503 }) : new Response(JSON.stringify(body), { status }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('NBA props board', () => {
  it('shows each player with the reference line and hit rates', async () => {
    vi.stubGlobal('fetch', respond(payload));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    // PTS L10 median of [30,28,10,26,24,20] = 25 → reference 24,5 → L5 3/5, L10 3/6
    const table = screen.getByRole('table');
    expect(table.textContent).toContain('24,5');
    expect(table.textContent).toContain('60%');
    expect(table.textContent).toContain('50%');
    expect(screen.getByText(/no es la línea de una casa/)).toBeTruthy();
  });

  it('recomputes when the user moves the line and switches stat', async () => {
    vi.stubGlobal('fetch', respond(payload));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    await fireEvent.click(screen.getByRole('button', { name: 'Subir línea' }));
    expect(screen.getByRole('table').textContent).toContain('25');
    await fireEvent.click(screen.getByRole('button', { name: '3PM' }));
    expect(screen.getByRole('table').textContent).toContain('1,5');
  });

  it('opens the detail with L5/L10/L20/season', async () => {
    vi.stubGlobal('fetch', respond(payload));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    await fireEvent.click(screen.getByRole('button', { name: /Jayson Tatum/ }));
    const detail = screen.getByRole('complementary', { name: 'Detalle de Jayson Tatum' });
    expect(detail.textContent).toContain('Temporada');
    expect(detail.textContent).toContain('Lectura de los datos');
    expect(detail.textContent).toContain('No es una probabilidad ni una recomendación');
  });

  it('never shows figures when the stats source fails', async () => {
    vi.stubGlobal('fetch', respond({ error: 'stats_unavailable' }, 503));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText(/No mostramos cifras sin fuente/)).toBeTruthy());
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the opponent defense rank and head-to-head splits from the full history', async () => {
    const withDefense = { ...payload, defense: { ORL: { games: 6, pts: 129, reb: 48, ast: 29, fg3m: 15 }, CHI: { games: 6, pts: 110, reb: 44, ast: 25, fg3m: 12 } } };
    const history = { id: 7, games: [['2026-04-12', 'ORL', false, 36, 31, 6, 5, 3, '2025-26', 'BOS'], ['2026-03-01', 'ORL', true, 34, 12, 6, 5, 1, '2025-26', 'BOS'], ...payload.players[0].games] };
    vi.stubGlobal('fetch', vi.fn(async url => String(url).includes('/api/odds/') ? new Response('{}', { status: 503 }) : new Response(JSON.stringify(String(url).includes('/api/nba/player') ? history : withDefense))));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    expect(screen.getByRole('table').textContent).toContain('DEF 1º');
    await fireEvent.click(screen.getByRole('button', { name: /Jayson Tatum/ }));
    const detail = screen.getByRole('complementary', { name: 'Detalle de Jayson Tatum' });
    await waitFor(() => expect(detail.textContent).toContain('vs ORL'));
    expect(detail.textContent).toContain('Defensa de ORL');
    expect(detail.textContent).toContain('1 de 2'); // 31 over, 12 under at line 24,5
  });

  it('switches to the under side, filters by venue and sorts by L10', async () => {
    const second = { ...payload.players[0], id: 8, name: 'Bench Shooter', home: true, minutesL5: 22, games: [g(10), g(12), g(30), g(9), g(11)] };
    vi.stubGlobal('fetch', respond({ ...payload, players: [...payload.players, second] }));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText('Bench Shooter')).toBeTruthy());
    await fireEvent.click(screen.getByRole('button', { name: 'Menos de' }));
    // Tatum PTS line 24,5: L5 under = 2 of 5 → 40%
    expect(screen.getByRole('table').textContent).toContain('40%');
    await fireEvent.click(screen.getByRole('button', { name: 'Local' }));
    expect(screen.queryByText('Jayson Tatum')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Todos' , exact: true }));
    await fireEvent.change(screen.getByRole('combobox', { name: /Ordenar/ }), { target: { value: 'l10' } });
    const names = [...screen.getByRole('table').querySelectorAll('.player b')].map(b => b.textContent);
    expect(names.length).toBe(2);
  });

  it('uses the sportsbook points line when it exists and labels its source', async () => {
    const market = { source: 'The Odds API', fetchedAt: '2026-11-02T14:00:00Z', players: { 'jayson tatum': { name: 'Jayson Tatum', consensus: 27.5, books: [{}, {}, {}] } } };
    vi.stubGlobal('fetch', vi.fn(async url => new Response(JSON.stringify(String(url).includes('/api/odds/nba-player-points') ? market : payload))));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByRole('table').textContent).toContain('27,5'));
    expect(screen.getByRole('table').textContent).toContain('Casa');
    expect(screen.getByText(/línea real de puntos/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'REB' }));
    expect(screen.getByRole('table').textContent).toContain('Ref.');
  });
  it('splits the hit rate with and without a chosen teammate', async () => {
    const h = (id, pts) => ['2026-10-30', 'CHI', true, 34, pts, 6, 5, 2, '2026-27', 'BOS', id];
    const history = { id: 7, games: [h('g1', 30), h('g2', 28), h('g3', 10), h('g4', 26), h('g5', 24), h('g6', 20)],
      teammates: [{ id: 9, name: 'Jaylen Brown', minutes: 34, missed: 2, team: 'BOS', season: '2026-27', gameIds: ['g3', 'g5', 'g6', 'g4'] }] };
    vi.stubGlobal('fetch', vi.fn(async url => String(url).includes('/api/odds/') ? new Response('{}', { status: 503 }) : new Response(JSON.stringify(String(url).includes('/api/nba/player') ? history : payload))));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    await fireEvent.click(screen.getByRole('button', { name: /Jayson Tatum/ }));
    const select = await screen.findByRole('combobox', { name: /Sin compañero/ });
    await fireEvent.change(select, { target: { value: '9' } });
    const detail = screen.getByRole('complementary', { name: 'Detalle de Jayson Tatum' });
    // line 24,5: without (g1 30, g2 28) → 2 de 2; with (10, 26, 24, 20) → 1 de 4
    await waitFor(() => expect(detail.textContent).toContain('Sin Jaylen Brown'));
    expect(detail.textContent).toContain('2 de 2');
    expect(detail.textContent).toContain('1 de 4');
    expect(detail.textContent).toContain('Muestra pequeña');
  });
  it('shows what the opponent allows to the player position when positions exist', async () => {
    const withPos = { ...payload, players: [{ ...payload.players[0], position: 'F' }], defenseByPosition: { ORL: { F: { games: 6, pts: 41.5, reb: 15, ast: 7, fg3m: 5 } }, CHI: { F: { games: 6, pts: 36, reb: 13, ast: 6, fg3m: 4 } } } };
    vi.stubGlobal('fetch', respond(withPos));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    await fireEvent.click(screen.getByRole('button', { name: /Jayson Tatum/ }));
    const detail = screen.getByRole('complementary', { name: 'Detalle de Jayson Tatum' });
    expect(detail.textContent).toContain('Contra aleros (F)');
    expect(detail.textContent).toContain('41,5');
    expect(detail.textContent).toContain('1º de 2');
  });
});
