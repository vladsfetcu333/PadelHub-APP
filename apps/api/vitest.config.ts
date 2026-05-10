import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@padel/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
