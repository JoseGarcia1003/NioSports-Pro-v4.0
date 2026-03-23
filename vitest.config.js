import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.js'],
  },
  resolve: {
    alias: {
      $lib: '/src/lib',
      '$app/environment': '/tests/mocks/app-environment.js',
      '$app/stores': '/tests/mocks/stores.js',
      '$env/dynamic/private': '/tests/mocks/env.js',
    },
  },
});