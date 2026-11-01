import { writable } from 'svelte/store';
import { nbaCalendarUrl, nbaCalendarRows } from '$lib/product/calendar.js';

// One shared request for today's NBA games and total lines, reused by the
// game strip, the landing board and Today. Data stays fresh for 5 minutes.
const FRESH_MS = 5 * 60 * 1000;
const initial = () => ({ state: 'idle', games: [], fetchedAt: null, lines: null });
export const nbaToday = writable(initial());

let inflight = null;
let loadedAt = 0;

export function resetNbaToday() { inflight = null; loadedAt = 0; nbaToday.set(initial()); }

export function loadNbaToday({ force = false } = {}) {
  if (inflight) return inflight;
  if (!force && loadedAt && Date.now() - loadedAt < FRESH_MS) return Promise.resolve();
  nbaToday.update(v => ({ ...v, state: 'loading' }));
  inflight = (async () => {
    const linesPromise = fetch('/api/odds/nba-totals').then(async r => { const b = await r.json(); return r.ok && Array.isArray(b.events) ? b : null; }).catch(() => null);
    try {
      const res = await fetch(nbaCalendarUrl(Date.now(), 0));
      const body = await res.json().catch(() => ({}));
      const games = [...nbaCalendarRows(res, body)].sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)));
      const lines = await linesPromise;
      nbaToday.set({ state: games.length ? 'ready' : 'empty', games, fetchedAt: new Date(), lines });
      loadedAt = Date.now();
    } catch {
      nbaToday.set({ ...initial(), state: 'unavailable' });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
