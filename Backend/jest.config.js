module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/', '/__tests__/fixtures/'],
  testTimeout: 15000,
  setupFiles: ['<rootDir>/__tests__/setup.env.js'],
};
