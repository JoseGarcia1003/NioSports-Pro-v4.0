import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';
import base from './vitest.config.js';

// Browser conditions belong only to component tests. Server tests must retain
// Node exports (especially Stripe's synchronous webhook-signature verifier).
export default defineConfig({
  ...base,
  plugins: [...base.plugins, svelteTesting()],
  test: { ...base.test, include: ['tests/ui/**/*.test.js'], exclude: [] },
  resolve: { ...base.resolve, conditions: ['browser'] }
});
