import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests. Default to the node environment; files needing the DOM/localStorage
// opt in with a `// @vitest-environment jsdom` pragma at the top.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
