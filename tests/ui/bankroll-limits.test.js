import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/svelte';
vi.mock('$lib/services/authenticated-fetch.js', () => ({ authenticatedFetch: (url, options) => fetch(url, options) }));
import BankrollLimits from '../../src/lib/components/BankrollLimits.svelte';
import NbaSignals from '../../src/lib/components/NbaSignals.svelte';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const view = { limits: { maxStakeMinor: 2000, dailyStakeMinor: null, weeklyLossMinor: null, pauseUntil: null }, pending: null, pendingFrom: null, alerts: [{ id: 'loss_streak', level: 'warning', text: 'Llevas 3 tickets perdidos seguidos.' }] };

describe('Bankroll limits panel', () => {
  it('shows limits and alerts and requests a pause from the server', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => { calls.push([url, init.method || 'GET', init.body]); return new Response(JSON.stringify(init.method === 'PUT' ? { ...view, limits: { ...view.limits, pauseUntil: '2026-11-14T12:00:00Z' }, applied: {}, deferred: {} } : view)); }));
    const screen = render(BankrollLimits);
    await waitFor(() => expect(screen.getByText('Llevas 3 tickets perdidos seguidos.')).toBeTruthy());
    expect(document.body.textContent).toContain('Sin límite');
    await fireEvent.click(screen.getByText('7 días'));
    await waitFor(() => expect(document.body.textContent).toContain('Pausa activa'));
    expect(calls[1]).toEqual(['/api/bankroll/limits', 'PUT', JSON.stringify({ pauseDays: 7 })]);
  });
  it('explains deferred loosening honestly', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => new Response(JSON.stringify(init.method === 'PUT' ? { ...view, applied: {}, deferred: { maxStakeMinor: 9000 } } : view))));
    const screen = render(BankrollLimits);
    await waitFor(() => expect(screen.getByLabelText('Máximo por ticket (USD)')).toBeTruthy());
    await fireEvent.input(screen.getByLabelText('Máximo por ticket (USD)'), { target: { value: '90' } });
    await fireEvent.click(screen.getByText('Guardar límites'));
    await waitFor(() => expect(document.body.textContent).toContain('24 horas'));
  });
});

describe('Locked premium selection', () => {
  it('shows a locked card without any pick details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ day: '2026-11-08', locked: 1, edition: { day: '2026-11-08', sealedAt: '2026-11-08T17:00:00Z', method: 'reading-v1', entries: [{ locked: true, team: 'BOS', opponent: 'ORL', tipoff: '2026-11-08T23:30:00Z', stat: 'pts' }] }, history: { days: [], summary: { decided: 0, hits: 0, pending: 0, rate: null } } }))));
    const screen = render(NbaSignals);
    await waitFor(() => expect(screen.getByText('Selección premium')).toBeTruthy());
    expect(document.body.textContent).toContain('Lectura por reglas · v1');
    expect(document.body.textContent).not.toContain('reading-v1 ·');
  });
});
