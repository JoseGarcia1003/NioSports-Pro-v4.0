import { sveltekit } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/database', 'dompurify']
  },
  build: {
    chunkSizeWarningLimit: 800
  }
});