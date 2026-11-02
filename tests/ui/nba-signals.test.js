import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/svelte';
vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: (url, options) => fetch(url, options) }));
import NbaSignals from '../../src/lib/components/NbaSignals.svelte';

const entry = { playerId: 7, name: 'Jayson Tatum', team: 'BOS', opponent: 'ORL', home: false, tipoff: '2026-11-02T23:30:00Z', stat: 'pts', side: 'over', line: 25.5, books: 6, favour: 4, against: 1, findings: [{ weight: 1, title: 'Forma reciente', text: 'Supera 25,5 en 7 de sus últimos 10 partidos (70 %).' }] };
const reply = body => vi.fn(async () => new Response(JSON.stringify(body)));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('NBA signals', () => {
  it('shows the sealed edition with its line source and reasons', async () => {
    vi.stubGlobal('fetch', reply({ day: '2026-11-02', edition: { day: '2026-11-02', sealedAt: '2026-11-02T17:00:00Z', method: 'reading-v1', entries: [entry] }, history: { days: [], summary: { decided: 0, hits: 0, pending: 0, rate: null } } }));
    const screen = render(NbaSignals);
    await waitFor(() => expect(screen.getByText('Jayson Tatum')).toBeTruthy());
    const text = document.body.textContent;
    expect(text).toContain('Edición sellada');
    expect(text).toContain('línea de mercado · 6 casas');
    expect(text).toContain('Supera 25,5 en 7 de sus últimos 10');
    expect(text).toContain('Sin señales liquidadas todavía');
  });

  it('reports settled history with its sample and keeps misses visible', async () => {
    const days = [{ day: '2026-11-01', sealedAt: '2026-11-01T17:00:00Z', entries: [{ ...entry, result: { status: 'hit', actual: 30 } }, { ...entry, name: 'Franz Wagner', result: { status: 'miss', actual: 12 } }] }];
    vi.stubGlobal('fetch', reply({ day: '2026-11-02', edition: null, reason: 'lines_unavailable', history: { days, summary: { decided: 2, hits: 1, pending: 0, rate: 0.5 } } }));
    const screen = render(NbaSignals);
    await waitFor(() => expect(screen.getByText('Franz Wagner')).toBeTruthy());
    const text = document.body.textContent;
    expect(text).toContain('1 de 2');
    expect(text).toContain('muestra pequeña');
    expect(text).toContain('Todavía no hay líneas de las casas');
    expect(text).toContain('12 pts');
  });

  it('never shows figures when the server fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    const screen = render(NbaSignals);
    await waitFor(() => expect(screen.getByText(/No mostramos datos sin fuente/)).toBeTruthy());
  });
});
