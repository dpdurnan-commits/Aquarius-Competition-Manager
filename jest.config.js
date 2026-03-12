export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!babel.config.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  setupFiles: ['<rootDir>/jest.setup.js'],
};
