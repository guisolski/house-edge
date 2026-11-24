import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'reports/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '*.config.js',
      '*.config.ts',
      'stryker.config.json',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 20, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 8],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['tests/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 40, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 12],
    },
  },
);
