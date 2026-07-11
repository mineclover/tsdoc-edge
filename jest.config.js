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
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/.test-dist/__tests__/setup.js'],
  cache: false,
};
