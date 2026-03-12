import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],

  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/database', 'dompurify']
  },

  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
          vendor: ['dompurify']
        }
      }
    }
  },

  envPrefix: 'PUBLIC_'
});