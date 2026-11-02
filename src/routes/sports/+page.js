import { redirect } from '@sveltejs/kit';

// Retired on 2 Nov 2026: the main menu already reaches this content directly.
export function load() {
  redirect(308, '/sports/nba');
}
