import { error } from '@sveltejs/kit';
import { SLUG } from '$lib/product/sports-hub.js';
export function load({ params }) {
  const sport = SLUG[params.sport];
  if (!sport) error(404, 'Deporte no disponible');
  return { sport, slug: params.sport };
}
