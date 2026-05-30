import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', '.kilo'],
    setupFiles: [],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**/*.ts',
        'src/features/**/*.ts',
        'src/config/*.ts',
        'src/middleware.ts',
      ],
      exclude: [
        'src/lib/parser/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
