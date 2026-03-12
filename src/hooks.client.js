// src/hooks.client.js
// ════════════════════════════════════════════════════════════════
// SvelteKit llama automáticamente a este archivo en el cliente.
// Es el punto de entrada correcto para inicializar Sentry en el
// browser — se ejecuta una vez, antes de que cargue cualquier ruta.
//
// SETUP REQUERIDO:
//   1. npm install @sentry/sveltekit --legacy-peer-deps
//   2. Agregar en Vercel → Settings → Environment Variables:
//        VITE_SENTRY_DSN = https://TU_DSN@xxx.ingest.sentry.io/xxx
//   3. Para obtener el DSN:
//      a) Ve a sentry.io → Create Account (gratis)
//      b) New Project → SvelteKit
//      c) Copia el DSN que te muestra
//
// ¿Por qué Sentry?
//   Sin Sentry eres ciego en producción. Si un usuario tiene un
//   error de JS en su sesión, nunca te enteras. Sentry captura:
//   - Errores JS no capturados (throw, reject no manejados)
//   - Errores de navegación SvelteKit
//   - Errores manuales con Sentry.captureException(err)
//   - Performance (transacciones, Core Web Vitals)
// ════════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/sveltekit';
import { browser }  from '$app/environment';

const DSN = import.meta.env.VITE_SENTRY_DSN;

// Solo inicializar si el DSN está configurado y estamos en el browser.
// En dev local sin DSN, Sentry queda en modo "no-op" (sin enviar nada).
if (browser && DSN) {
  Sentry.init({
    dsn: DSN,

    // ── Entorno ───────────────────────────────────────────────────
    // 'production' = errores van a Sentry.
    // 'development' = no enviar (spam innecesario).
    environment: import.meta.env.MODE || 'production',

    // Versión del release — útil para correlacionar errores con deploys.
    // VITE_APP_VERSION se puede setear en CI/CD o en Vercel env vars.
    release: import.meta.env.VITE_APP_VERSION
             ? `niosports-pro@${import.meta.env.VITE_APP_VERSION}`
             : 'niosports-pro@4.0.0',

    // ── Sample rates ─────────────────────────────────────────────
    // 1.0 = captura el 100% de los errores (recomendado para empezar)
    // 0.1 = captura el 10% de las sesiones para performance
    sampleRate:        1.0,
    tracesSampleRate:  0.1,

    // ── Integrations ─────────────────────────────────────────────
    integrations: [
      // Captura errores de navegación SvelteKit (404, errores de ruta)
      Sentry.browserTracingIntegration(),
    ],

    // ── Filtros ───────────────────────────────────────────────────
    // Ignorar errores de extensiones de browser y errores de red
    // que son fuera del control de la app (adblockers, etc.)
    ignoreErrors: [
      // Errores de red esperados (usuario sin conexión)
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // Errores de extensiones del browser
      'chrome-extension',
      'moz-extension',
      // Firebase auth expected cancellations
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
    ],

    // ── Antes de enviar ───────────────────────────────────────────
    // Filtrar errores y enriquecer con contexto de la app
    beforeSend(event, hint) {
      // No enviar en desarrollo aunque haya DSN
      if (import.meta.env.DEV) return null;

      // No enviar errores de bots/scrapers (user-agent sin JavaScript real)
      const ua = navigator?.userAgent || '';
      if (/bot|crawl|spider/i.test(ua)) return null;

      return event;
    },
  });
}

// ── handleError: capturar errores de carga de rutas SvelteKit ────
// SvelteKit llama a esta función cuando hay un error en una ruta.
// Sin este handler, los errores de rutas nunca llegarían a Sentry.
export const handleError = Sentry.handleErrorWithSentry(
  // Función base opcional — puedes añadir lógica custom aquí
  ({ error, event }) => {
    // Errores de rutas no encontradas son esperados — solo logear
    if (event?.url?.pathname) {
      console.warn('[hooks.client] Error en ruta:', event.url.pathname, error?.message);
    }
  }
);
