import { redirect } from '@sveltejs/kit';

// Match Studio (a demo with fictitious teams) was retired on 2 Nov 2026:
// Mercado de puntos does the same exploration with real data.
export function load() {
  redirect(308, '/sports/nba/puntos');
}
