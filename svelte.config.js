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
      // Usar Edge Runtime para las rutas del servidor cuando sea posible
      // (menor latencia que Node.js serverless en Vercel)
      runtime: 'nodejs20.x',
    }),

    // Alias $lib → src/lib (disponible en todos los archivos .svelte y .js)
    // Uso: import { authStore } from '$lib/stores/auth'
    // Sin alias necesitarías: import { authStore } from '../../lib/stores/auth'
    alias: {
      '$lib': 'src/lib'
    },

    // CSP generado en servidor — SvelteKit puede inyectar nonces automáticamente
    // para eliminar 'unsafe-inline' por completo. Cada request genera un nonce
    // único que se aplica a los scripts de hydration de Svelte.
    csp: {
      mode: 'auto',  // 'auto' = nonce en SSR, hash en prerendering
      directives: {
        'default-src':     ["'self'"],
        'script-src':      [
          "'self'",
          // SvelteKit inyecta el nonce aquí automáticamente en modo 'auto'
          // Esto reemplaza 'unsafe-inline' con nonces únicos por request
          'https://www.gstatic.com',
          'https://apis.google.com',
          'https://cdn.tailwindcss.com',
          'https://cdnjs.cloudflare.com',
          'https://browser.sentry-cdn.com',
        ],
        'connect-src':     [
          "'self'",
          'https://*.firebaseio.com',
          'wss://*.firebaseio.com',
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
          'https://www.googleapis.com',
          'https://api.balldontlie.io',
          'https://*.ingest.sentry.io',
        ],
        'style-src':       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src':        ["'self'", 'data:', 'https://fonts.gstatic.com'],
        'img-src':         ["'self'", 'data:', 'https://*.googleusercontent.com', 'https://www.gstatic.com'],
        'frame-src':       ['https://accounts.google.com', 'https://*.firebaseapp.com'],
        'object-src':      ["'none'"],
        'base-uri':        ["'self'"],
        'frame-ancestors': ["'none'"],
      }
    }
  }
};

export default config;
