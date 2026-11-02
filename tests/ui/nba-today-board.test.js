import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/svelte';
import NbaTodayBoard from '../../src/lib/components/NbaTodayBoard.svelte';
import { resetNbaToday } from '../../src/lib/stores/nba-today.js';

const team = (a, n) => ({ id: a, abbreviation: a, full_name: `${n} Team`, name: n });
const games = Array.from({ length: 15 }, (_, k) => ({ id: k + 1, datetime: '2026-11-03T00:00:00Z', status: 'scheduled', status_state: 'scheduled', period: 0, visitor_team: team(`V${k}`, `Visit${k}`), home_team: team(`H${k}`, `Home${k}`) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); resetNbaToday(); });

describe('NbaTodayBoard', () => {
  it('reserves the limited height while loading and shows the rest as a count (landing)', async () => {
    let release;
    vi.stubGlobal('fetch', vi.fn(url => String(url).includes('/api/odds/') ? Promise.resolve(new Response('{}', { status: 503 })) : new Promise(r => { release = () => r(new Response(JSON.stringify({ data: games }), { headers: { 'X-Data-Source': 'balldontlie' } })); })));
    const screen = render(NbaTodayBoard, { props: { limit: 5 } });
    await waitFor(() => expect(screen.container.querySelectorAll('li.skeleton')).toHaveLength(5));
    release();
    await waitFor(() => expect(screen.container.querySelectorAll('ul.games > li:not(.skeleton)')).toHaveLength(5));
    expect(screen.getByText('y 10 partidos más hoy')).toBeTruthy();
    expect(screen.getByText('15 partidos')).toBeTruthy();
  });
  it('shows every game when there is no limit (Hoy)', async () => {
    vi.stubGlobal('fetch', vi.fn(url => Promise.resolve(String(url).includes('/api/odds/') ? new Response('{}', { status: 503 }) : new Response(JSON.stringify({ data: games }), { headers: { 'X-Data-Source': 'balldontlie' } }))));
    const screen = render(NbaTodayBoard);
    await waitFor(() => expect(screen.container.querySelectorAll('ul.games > li:not(.skeleton)')).toHaveLength(15));
    expect(screen.queryByText(/partidos más hoy/)).toBeNull();
  });
});
