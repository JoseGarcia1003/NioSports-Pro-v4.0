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
          'https://cdn.tailwindcss.com',
          'https://cdnjs.cloudflare.com',
          'https://browser.sentry-cdn.com',
        ],
        'connect-src':     [
          'self',
          'https://*.supabase.co',
          'wss://*.supabase.co',
          'https://*.firebaseio.com',
          'wss://*.firebaseio.com',
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
          'https://www.googleapis.com',
          'https://firebasestorage.googleapis.com',
          'https://api.balldontlie.io',
          'https://*.railway.app',
          'https://*.upstash.io',
          'https://*.ingest.sentry.io',
        ],
        // Las transiciones de Svelte y los estilos de componentes son dinámicos.
        'style-src':       ['self', 'unsafe-inline', 'https://fonts.googleapis.com', 'https://cdn.tailwindcss.com'],
        'font-src':        ['self', 'data:', 'https://fonts.gstatic.com'],
        'img-src':         ['self', 'data:', 'blob:', 'https://*.googleusercontent.com', 'https://www.gstatic.com', 'https://a.espncdn.com', 'https://ui-avatars.com'],
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
