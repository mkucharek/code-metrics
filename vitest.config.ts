import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts',
        '**/index.ts', // Re-export files
        'src/presentation/cli/index.ts', // CLI entry point (tested via integration)
      ],
      thresholds: {
        lines: 40,
        functions: 70,
        branches: 90,
        statements: 40,
      },
    },
  },
});
