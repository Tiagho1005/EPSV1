/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/routes/**/*.js',
    'src/middleware/**/*.js',
    '!src/config/logger.js',
  ],
  coverageReporters: ['text', 'lcov'],
  // Silenciar logs de winston durante tests
  setupFiles: ['./jest.setup.js'],
};
