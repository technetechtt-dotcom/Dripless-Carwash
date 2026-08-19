import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 20, functions: 20, statements: 20, branches: 15 }
    }
  }
});
