import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  // src/lib/data/contract.js imports ml/contracts/dictionary.json; SvelteKit's dev
  // server only serves src/ by default, so /today, /sports/nba and /tennis returned 500 in dev.
  server: { fs: { allow: ['ml/contracts'] } },
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NioSports Pro',
        short_name: 'NioSports',
        description: 'Props NBA, tenis y bankroll con datos verificables.',
        theme_color: '#0a0c10',
        background_color: '#0a0c10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        importScripts: ['/sw-cache-cleanup.js'],
        navigateFallback: null,
        runtimeCaching: [
          {
            // Identity changes must never reuse a previous account's response.
            urlPattern: ({ url, request }) => url.pathname.startsWith('/api/') || request.headers.has('authorization'),
            handler: 'NetworkOnly',
            options: { fetchOptions: { cache: 'no-store' } },
          },
        ],
      },
    }),
  ],
});
