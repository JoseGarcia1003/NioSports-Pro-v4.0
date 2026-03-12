// src/hooks.server.js
// ════════════════════════════════════════════════════════════════
// SvelteKit llama automáticamente a este archivo en el servidor
// (en Vercel, esto son las Serverless Functions de SvelteKit).
//
// Captura:
//   - Errores en load() de rutas (+page.server.js si los hubiera)
//   - Errores en las API routes de SvelteKit
//   - Cualquier error no capturado en el contexto de servidor
//
// IMPORTANTE: Para las funciones en /api/*.js de Vercel (proxy,
// firebase-config, etc.), los errores van a los logs de Vercel
// directamente — este hook cubre el lado SvelteKit del servidor.
// ════════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/sveltekit';

const DSN = process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,

    environment: process.env.NODE_ENV || 'production',

    release: process.env.VITE_APP_VERSION
             ? `niosports-pro@${process.env.VITE_APP_VERSION}`
             : 'niosports-pro@4.0.0',

    // En servidor capturamos todos los errores (no hay problema de volumen
    // porque las SSR calls son pocas — NioSports es mayoritariamente CSR)
    sampleRate:       1.0,
    tracesSampleRate: 0.05,  // Solo 5% de traces en servidor

    // No enviar errores esperados del router (404 etc.)
    ignoreErrors: [
      'Not Found',
      'ECONNRESET',
    ],

    beforeSend(event) {
      // No enviar en desarrollo
      if (process.env.NODE_ENV === 'development') return null;
      return event;
    },
  });
}

// ── handleError: capturar errores de rutas en el servidor ────────
export const handleError = Sentry.handleErrorWithSentry(
  ({ error, event }) => {
    const path = event?.url?.pathname ?? 'unknown';

    // Errores 404 son esperados — log silencioso
    if (error?.status === 404) {
      console.warn(`[hooks.server] 404: ${path}`);
      return;
    }

    // Otros errores de servidor — log con contexto
    console.error(`[hooks.server] Error en ${path}:`, error?.message || error);
  }
);

// ── handle: middleware global de SvelteKit ────────────────────────
// Puedes añadir lógica aquí que se ejecute en CADA request del servidor.
// Por ejemplo: headers de seguridad adicionales, logging, auth checks.
//
// Por ahora solo hace pass-through — los headers de seguridad ya están
// en vercel.json que es más eficiente (se aplican en el edge, no en JS).
export async function handle({ event, resolve }) {
  const response = await resolve(event);
  return response;
}
