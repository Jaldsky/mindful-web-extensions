module.exports = {
    testEnvironment: 'jsdom',

    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    testMatch: [
        '<rootDir>/**/*.test.js'
    ],

    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/'
    ],

    moduleFileExtensions: ['js', 'json'],

    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        '../src/**/*.js',
        '../tracker.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],

    testTimeout: 10000,

    globals: {
        chrome: true
    },

    clearMocks: true,
    restoreMocks: true
};
