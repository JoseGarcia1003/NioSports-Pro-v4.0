import { redirect } from '@sveltejs/kit';

// Team props moved to their own section (Mercado de puntos).
export function load({ url }) {
  if (url.searchParams.get('vista') === 'equipos') redirect(308, '/sports/nba/puntos');
}
