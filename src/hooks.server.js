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

  // Add CSP that allows Supabase, Firebase, Railway, and other required services
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.googleusercontent.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://api.balldontlie.io https://*.railway.app https://*.ingest.sentry.io",
      "frame-src 'self' https://*.firebaseapp.com",
      "worker-src 'self' blob:",
    ].join('; ')
  );

  return response;
}