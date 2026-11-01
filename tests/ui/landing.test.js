import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/svelte';
import LandingExperience from '../../src/lib/components/landing/LandingExperience.svelte';
import { resetNbaToday } from '../../src/lib/stores/nba-today.js';

const team = (full_name, abbreviation) => ({ full_name, abbreviation, name: full_name.split(' ').slice(-1)[0] });
const game = (id, datetime, extra = {}) => ({ id, datetime, status: datetime, status_state: 'scheduled', period: 0, home_team: team('Orlando Magic', 'ORL'), visitor_team: team('Boston Celtics', 'BOS'), home_team_score: 0, visitor_team_score: 0, ...extra });
const ok = data => new Response(JSON.stringify({ data }), { headers: { 'X-Data-Source': 'balldontlie' } });
const noLines = () => new Response(JSON.stringify({ ok: false, events: null }), { status: 503 });
// Route by URL: the board asks for games and, in parallel, for betting lines.
const router = (games, lines = noLines) => vi.fn(url => Promise.resolve(String(url).includes('/api/odds/') ? lines() : games()));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); resetNbaToday(); });

describe('Landing shows today\'s real NBA slate', () => {
  it('lists provider games with their source', async () => {
    vi.stubGlobal('fetch', router(() => ok([game(2, '2026-11-02T01:30:00Z'), game(1, '2026-11-01T20:30:00Z')])));
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('2 partidos'));
    expect(board.textContent).toContain('Boston Celtics');
    expect(board.textContent).toContain('Partidos: balldontlie · consultado');
  });

  it('shows scores only once a game has started', async () => {
    vi.stubGlobal('fetch', router(() => ok([game(1, '2026-11-01T20:30:00Z', { status: 'Final', status_state: 'final', period: 4, home_team_score: 110, visitor_team_score: 104 })])));
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('Final'));
    expect(board.textContent).toContain('110');
  });

  it('never fills the board when the provider is unavailable, and can retry', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', router(() => ++calls === 1
      ? new Response(JSON.stringify({ data: null }), { status: 502, headers: { 'X-Data-Source': 'unavailable' } })
      : ok([game(1, '2026-11-01T20:30:00Z')])));
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('No pudimos confirmar'));
    expect(board.textContent).not.toContain('Celtics');
    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(board.textContent).toContain('Boston Celtics'));
  });

  it('shows the consensus total line next to the matching game, with its source', async () => {
    const lines = () => new Response(JSON.stringify({ source: 'The Odds API', fetchedAt: '2026-11-01T18:00:00Z', events: [
      { id: 'x', commenceTime: '2026-11-01T20:30:00Z', home: 'Orlando Magic', away: 'Boston Celtics', books: [{}, {}], consensus: 216.5 },
      { id: 'y', commenceTime: '2026-11-01T20:30:00Z', home: 'Los Angeles Lakers', away: 'Boston Celtics', books: [{}], consensus: 230.5 }
    ] }), { status: 200 });
    vi.stubGlobal('fetch', router(() => ok([game(1, '2026-11-01T20:30:00Z')]), lines));
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('O/U 216,5'));
    expect(board.textContent).not.toContain('230,5');
    expect(board.textContent).toContain('Líneas de total: The Odds API');
  });

  it('keeps the games when betting lines are unavailable', async () => {
    vi.stubGlobal('fetch', router(() => ok([game(1, '2026-11-01T20:30:00Z')])));
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('Boston Celtics'));
    expect(board.textContent).toContain('Líneas de total no disponibles');
    expect(board.textContent).not.toContain('O/U');
  });

  it('hides the pre-game line once the game has started', async () => {
    const lines = () => new Response(JSON.stringify({ source: 'The Odds API', fetchedAt: '2026-11-01T18:00:00Z', events: [
      { id: 'x', commenceTime: '2026-11-01T20:30:00Z', home: 'Orlando Magic', away: 'Boston Celtics', books: [{}], consensus: 211.5 }
    ] }), { status: 200 });
    vi.stubGlobal('fetch', router(() => ok([game(1, '2026-11-01T20:30:00Z', { status_state: 'in_progress', period: 2, home_team_score: 40, visitor_team_score: 44 })]), lines));
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('En juego'));
    expect(board.textContent).not.toContain('O/U');
  });
});
