import { redirect } from '@sveltejs/kit';

// Retired on 2 Nov 2026: the verifiable history lives in Señales.
export function load() {
  redirect(308, '/predictions#history-title');
}
