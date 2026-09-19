// src/hooks.server.js

import * as Sentry from '@sentry/sveltekit';

const DSN = process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'production',
    release: process.env.VITE_APP_VERSION
             ? `niosports-pro@${process.env.VITE_APP_VERSION}`
             : 'niosports-pro@4.0.0',
    sampleRate:       1.0,
    tracesSampleRate: 0.05,
    ignoreErrors: ['Not Found', 'ECONNRESET'],
    beforeSend(event) {
      if (process.env.NODE_ENV === 'development') return null;
      return event;
    },
  });
}

export const handleError = Sentry.handleErrorWithSentry(
  ({ error, event }) => {
    const path = event?.url?.pathname ?? 'unknown';
    if (error?.status === 404) {
      console.warn(`[hooks.server] 404: ${path}`);
      return;
    }
    console.error(`[hooks.server] Error en ${path}:`, error?.message || error);
  }
);

export async function handle({ event, resolve }) {
  const response = await resolve(event);

  // SvelteKit owns CSP and its per-response nonces (see svelte.config.js).
  // API responses can depend on identity even when their URL stays the same.
  if (event.url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, no-store');
  }

  return response;
}
