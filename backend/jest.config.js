/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }] },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/helpers/env.ts'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/worker.ts', '!src/types/**'],
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  // CI fails if coverage of the full suite (unit + integration) drops below these.
  coverageThreshold: {
    global: { statements: 85, branches: 70, functions: 85, lines: 85 },
  },
};
