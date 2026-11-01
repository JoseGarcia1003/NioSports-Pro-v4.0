import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/svelte';
import LandingExperience from '../../src/lib/components/landing/LandingExperience.svelte';

const team = (full_name, abbreviation) => ({ full_name, abbreviation });
const game = (id, datetime, extra = {}) => ({ id, datetime, status: datetime, status_state: 'scheduled', period: 0, home_team: team('Orlando Magic', 'ORL'), visitor_team: team('Boston Celtics', 'BOS'), home_team_score: 0, visitor_team_score: 0, ...extra });
const ok = data => new Response(JSON.stringify({ data }), { headers: { 'X-Data-Source': 'balldontlie' } });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Landing shows today\'s real NBA slate', () => {
  it('lists provider games with their source', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([game(2, '2026-11-02T01:30:00Z'), game(1, '2026-11-01T20:30:00Z')])));
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('2 partidos'));
    expect(board.textContent).toContain('Boston Celtics');
    expect(board.textContent).toContain('Fuente: balldontlie · consultado');
  });

  it('shows scores only once a game has started', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([game(1, '2026-11-01T20:30:00Z', { status: 'Final', status_state: 'final', period: 4, home_team_score: 110, visitor_team_score: 104 })])));
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('Final'));
    expect(board.textContent).toContain('110');
  });

  it('never fills the board when the provider is unavailable, and can retry', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: null }), { status: 502, headers: { 'X-Data-Source': 'unavailable' } }))
      .mockResolvedValueOnce(ok([game(1, '2026-11-01T20:30:00Z')]));
    vi.stubGlobal('fetch', fetcher);
    const screen = render(LandingExperience);
    const board = screen.getByRole('region', { name: 'Hoy en la NBA' });
    await waitFor(() => expect(board.textContent).toContain('No pudimos confirmar'));
    expect(board.textContent).not.toContain('Celtics');
    await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(board.textContent).toContain('Boston Celtics'));
  });
});
