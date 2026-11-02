import { redirect } from '@sveltejs/kit';

// Legacy route retired on 2 Nov 2026 (no user data was stored here); its current home:
export function load() {
  redirect(308, '/bankroll');
}
