/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  // Dead Maguey features Nabani doesn't use (receipt-scan / expense-draft OCR, dropped per D6).
  // The code stays as reference, but its specs must not gate the Nabani build/deploy.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/app/modules/expenses/',
    '<rootDir>/src/app/layout/common/draft-notification/'
  ],
  modulePaths: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/modules/shared/$1',
    '^@root/(.*)$': '<rootDir>/src/$1',
    '^lodash-es$': 'lodash',
    '^lodash-es/(.*)$': 'lodash/$1',
    '^d3$': '<rootDir>/node_modules/d3/dist/d3.min.js',
    '^d3-sankey$': '<rootDir>/node_modules/d3-sankey/dist/d3-sankey.min.js',
    '\\.(css|scss)$': '<rootDir>/jest-style-mock.js'
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@ngneat|@ng-select|server-table-pagination)'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.model.ts',
    '!src/app/**/index.ts',
    // DI/route wiring with no logic — exercised by the e2e suite through the real router
    '!src/app/**/*.module.ts',
    '!src/app/**/*.routing.ts',
    '!src/app/**/*.route.ts',
    '!src/app/core/icons/icons.provider.ts',
    // bootstrap wiring — exercised by the e2e suite through the real app
    '!src/app/app.config.ts'
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 85,
      functions: 95,
      lines: 95
    }
  },
  clearMocks: true,
  maxWorkers: '50%'
};
