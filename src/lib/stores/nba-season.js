import { writable } from 'svelte/store';
import { authenticatedFetch } from '$lib/services/authenticated-fetch.js';

// One request per season shared by Estadísticas and Clasificación.
export const nbaSeason = writable({ state: 'idle', season: null, data: null });
const loaded = new Map();

export async function loadNbaSeason(season = '') {
  const key = season || 'current';
  if (loaded.has(key)) { nbaSeason.set({ state: 'ready', season: loaded.get(key).season, data: loaded.get(key) }); return; }
  nbaSeason.update(v => ({ ...v, state: 'loading' }));
  try {
    const res = await authenticatedFetch(`/api/nba/stats${season ? `?season=${encodeURIComponent(season)}` : ''}`);
    const body = await res.json();
    if (!res.ok || !Array.isArray(body.players) || !body.standings) throw new Error('unavailable');
    loaded.set(key, body);
    nbaSeason.set({ state: 'ready', season: body.season, data: body });
  } catch {
    nbaSeason.set({ state: 'unavailable', season, data: null });
  }
}

export function resetNbaSeason() { loaded.clear(); nbaSeason.set({ state: 'idle', season: null, data: null }); }
