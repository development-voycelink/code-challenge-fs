module.exports = {
  root: true,
  ignorePatterns: [
    '**/*.d.ts',
    '**/.next/**',
    '**/dist/**',
    '**/node_modules/**',
  ],
  overrides: [
    {
      files: ['packages/call-service/src/**/*.ts', 'packages/realtime-service/src/**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      env: {
        es2020: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
    {
      files: ['packages/contracts/**/*.js'],
      extends: ['eslint:recommended'],
      env: {
        es2020: true,
        node: true,
      },
    },
  ],
};
