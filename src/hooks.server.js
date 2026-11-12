// src/hooks.server.js

import * as Sentry from '@sentry/sveltekit';
import { adminDatabase } from '$lib/server/entitlements.js';
import { recordServerError } from '$lib/server/telemetry.js';

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
    // First-party record (route pattern, message, status); never blocks or throws.
    let db = null;
    try { db = adminDatabase(); } catch { /* database not configured */ }
    if (db) return recordServerError(db, { route: event?.route?.id || path, message: error?.message || String(error), status: error?.status });
  }
);

/** Identity-independent, read-only endpoints (seal ledger, track record, schedules, feed status). */
const PUBLIC_API = ['/api/public/', '/api/sports/', '/api/nba/schedule', '/api/odds/nba-totals'];

export async function handle({ event, resolve }) {
  const response = await resolve(event);

  // SvelteKit owns CSP and its per-response nonces (see svelte.config.js).
  // API responses can depend on identity even when their URL stays the same.
  // Only endpoints that serve the same public data to everyone may be cached.
  const path = event.url.pathname;
  if (path.startsWith('/api/') && !(PUBLIC_API.some(p => path.startsWith(p)) && !event.request?.headers?.has('authorization') && /^public\b/.test(response.headers.get('Cache-Control') || ''))) {
    response.headers.set('Cache-Control', 'private, no-store');
  }

  return response;
}
