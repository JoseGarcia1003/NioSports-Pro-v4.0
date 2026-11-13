import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/svelte';
vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: (url, options) => fetch(url, options) }));
import Home from '../../src/lib/components/HomeExperience.svelte';
import { resetNbaToday } from '../../src/lib/stores/nba-today.js';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); resetNbaToday(); });

const dashboard = { day: '2026-11-13', edition: { sealed: true, count: 2, sealedAt: '2026-11-13T16:40:00Z', sealHash: 'ab'.repeat(32), top: [{ name: 'Jayson Tatum', team: 'BOS', opponent: 'ORL', home: true, tipoff: '2026-11-14T00:30:00Z', side: 'over', line: 25.5, p: 0.61 }, { locked: true, team: 'DEN', opponent: 'LAL', tipoff: '2026-11-14T03:00:00Z' }] },
  record: { summary: { hits: 7, decided: 12 }, lastDay: { day: '2026-11-12', hits: 3, misses: 2, voids: 0, decided: 5 } },
  bankroll: { started: true, availableMinor: 52000, reservedMinor: 2000, profitMinor: -1500, pendingTickets: 1, metrics: { yield: -0.075, won: 4, decided: 9, conclusive: false }, recent: [{ id: 1, kind: 'stake', deltaMinor: -2000, note: 'Ticket' }] },
  limits: { pauseUntil: null, alerts: [] }, data: { boxScoresThrough: '2026-11-12', fresh: true } };
const serve = body => vi.fn(async url => (String(url).includes('/api/dashboard') ? new Response(JSON.stringify(body)) : new Response('{}', { status: 503 })));

describe('member dashboard', () => {
  it('shows the sealed signals, the honest record and the bankroll from one server response', async () => {
    vi.stubGlobal('fetch', serve(dashboard));
    const screen = render(Home);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    const text = document.body.textContent;
    expect(text).toContain('Más de 25,5'); expect(text).toContain('61 % según el modelo');
    expect(text).toContain('Selección premium');
    expect(text).toContain('7/12'); expect(text).toContain('Muestra pequeña (12 de 100)');
    expect(text).toContain('Resultados del 12 de noviembre: 3 de 5 señales acertadas.');
    expect(text).toContain('4/9'); expect(text).toContain('orientativas');
    expect(text).not.toMatch(/undefined|NaN/);
  });
  it('says so when the summary cannot be loaded and offers a retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    const screen = render(Home);
    await waitFor(() => expect(screen.getByText(/No pudimos cargar tu resumen/)).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
  it('invites a new member to start the bankroll log without inventing figures', async () => {
    vi.stubGlobal('fetch', serve({ ...dashboard, edition: { sealed: false, count: 0, top: [], reason: 'data_stale' }, record: { summary: { hits: 0, decided: 0 }, lastDay: null }, bankroll: { started: false, pendingTickets: 0 }, data: { boxScoresThrough: '2026-10-31', fresh: false } }));
    const screen = render(Home);
    await waitFor(() => expect(screen.getByText('Empezar mi registro')).toBeTruthy());
    expect(document.body.textContent).toContain('no publicamos con datos antiguos');
    expect(document.body.textContent).toContain('Sin señales liquidadas todavía');
  });
});
