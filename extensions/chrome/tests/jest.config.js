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

    collectCoverage: false,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        '../src/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],

    testTimeout: 8000,
    maxWorkers: '50%',

    globals: {
        chrome: true
    },

    clearMocks: true,
    restoreMocks: true
};
