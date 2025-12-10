module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', 'src/types/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Memory optimization
  maxWorkers: 2,
  workerIdleMemoryLimit: '256MB',
  // Clear mocks and modules between tests
  clearMocks: true,
  restoreMocks: true,
  // Global setup to reset singletons after each test file
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // Reduce memory by not caching transforms
  cache: false,
};
