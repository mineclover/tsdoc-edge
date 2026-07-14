module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/.test-dist'],
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['js', 'json', 'node'],
  transform: {
    '^.+\\.js$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
      },
    ],
  },
  collectCoverageFrom: [
    '.test-dist/**/*.js',
    '!.test-dist/**/*.test.js',
    '!.test-dist/**/*.spec.js',
    '!.test-dist/**/__tests__/**',
  ],
  coverageProvider: 'babel',
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  maxWorkers: 1,
  // Command-oriented tests can emit very large stdout volumes; keep release
  // lanes focused on assertions and avoid Node 24 worker crashes from log pressure.
  silent: true,
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/.test-dist/__tests__/setup.js'],
  cache: false,
};
