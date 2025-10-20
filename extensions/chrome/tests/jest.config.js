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

    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        '../src/**/*.js',
        '../AppManager.js',
        '../background.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],

    testTimeout: 10000,

    globals: {
        chrome: true
    },

    transformIgnorePatterns: [
        'node_modules/(?!(.*\\.mjs$))'
    ],

    clearMocks: true,
    restoreMocks: true
};
