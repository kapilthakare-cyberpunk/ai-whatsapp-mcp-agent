module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'babel',
};