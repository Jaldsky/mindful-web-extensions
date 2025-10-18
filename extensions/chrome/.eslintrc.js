module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Chrome Extension specific rules
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-template': 'error',
    
    // Allow Chrome Extension APIs
    'no-undef': 'off',
    
    // Relaxed rules for existing code
    semi: 'off',
    indent: 'off',
    'no-trailing-spaces': 'off',
    'space-before-function-paren': 'off',
    'padded-blocks': 'off',
    'eol-last': 'off',
    'quote-props': 'off',
    'object-curly-spacing': 'off',
    'object-shorthand': 'off',
    'no-new': 'off',
    'eqeqeq': 'off'
  },
  globals: {
    // Chrome Extension APIs
    chrome: 'readonly',
    
    // Jest globals
    describe: 'readonly',
    it: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
    jest: 'readonly'
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'dist/',
    'build/'
  ]
}
