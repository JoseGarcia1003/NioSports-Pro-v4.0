// svelte.config.js
// ════════════════════════════════════════════════════════════════
// El adaptador de Vercel convierte las rutas de SvelteKit en
// Serverless Functions automáticamente — no necesitas configurar
// nada en Vercel, solo hacer push y el deploy funciona.
// ════════════════════════════════════════════════════════════════
import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      // Node LTS alineado con CI; Node 20 ya no admite nuevos despliegues.
      runtime: 'nodejs24.x',
    }),

    // Detects a new deployment so an open tab never keeps running old code:
    // the layout reloads fully on the next navigation and offers an update.
    version: { pollInterval: 60_000 },

    // Alias $lib → src/lib (disponible en todos los archivos .svelte y .js)
    // Uso: import { authStore } from '$lib/stores/auth'
    // Sin alias necesitarías: import { authStore } from '../../lib/stores/auth'
    alias: {
      '$lib': 'src/lib'
    },

    // Única CSP: SvelteKit añade el nonce de SSR o los hashes de prerendering.
    // No sobreescribir esta cabecera en hooks.server.js ni en vercel.json.
    csp: {
      mode: 'auto',  // 'auto' = nonce en SSR, hash en prerendering
      directives: {
        'default-src':     ['self'],
        'script-src':      [
          'self',
          'https://www.gstatic.com',
          'https://apis.google.com',
        ],
        'connect-src':     [
          'self',
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
          'https://www.googleapis.com',
          'https://*.ingest.sentry.io',
        ],
        // Las transiciones de Svelte y los estilos de componentes son dinámicos.
        'style-src':       ['self', 'unsafe-inline'],
        'font-src':        ['self', 'data:'],
        'img-src':         ['self', 'data:', 'blob:', 'https://*.googleusercontent.com', 'https://www.gstatic.com'],
        'frame-src':       ['self', 'https://accounts.google.com', 'https://*.firebaseapp.com', 'https://js.stripe.com'],
        'worker-src':      ['self', 'blob:'],
        'manifest-src':    ['self'],
        'object-src':      ['none'],
        'base-uri':        ['self'],
        'form-action':     ['self'],
        'frame-ancestors': ['none'],
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production',
      }
    }
  }
};

export default config;
