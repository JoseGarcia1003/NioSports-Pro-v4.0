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
const respond = (body, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
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
    expect(screen.getByText(/No es la línea de una casa de apuestas/)).toBeTruthy();
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
    vi.stubGlobal('fetch', vi.fn(async url => new Response(JSON.stringify(String(url).includes('/api/nba/player/') ? history : withDefense))));
    const screen = render(NbaPropsBoard);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    expect(screen.getByRole('table').textContent).toContain('DEF 1º');
    await fireEvent.click(screen.getByRole('button', { name: /Jayson Tatum/ }));
    const detail = screen.getByRole('complementary', { name: 'Detalle de Jayson Tatum' });
    await waitFor(() => expect(detail.textContent).toContain('vs ORL'));
    expect(detail.textContent).toContain('Defensa de ORL');
    expect(detail.textContent).toContain('1 de 2'); // 31 over, 12 under at line 24,5
  });
});
