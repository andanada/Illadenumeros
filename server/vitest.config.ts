import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/migrate-cli.ts'],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 80 },
    },
  },
})
