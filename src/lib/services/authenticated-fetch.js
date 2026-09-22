import { get } from 'svelte/store';
import { currentUser } from '$lib/stores/auth.js';

export async function getAccessToken() {
  return await get(currentUser)?.getIdToken() ?? null;
}

export async function authenticatedFetch(url, options = {}) {
  if (typeof url !== 'string' || !url.startsWith('/api/') || url.startsWith('//')) {
    throw new Error('Authenticated requests must use a local API path');
  }
  const token = await getAccessToken();
  if (!token) throw new Error('Inicia sesión para continuar.');
  const headers = new Headers(options.headers);
  headers.set('authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers, cache: 'no-store' });
}
