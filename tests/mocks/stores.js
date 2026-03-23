// Mock $app/stores
import { writable, readable } from 'svelte/store';

export const page = readable({
  url: new URL('http://localhost:5173/'),
  params: {},
});

export const navigating = readable(null);
export const updated = readable(false);