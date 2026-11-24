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
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 12],
    },
  },
  {
    // Browser evaluate payloads are intentionally self-contained.
    files: ['e2e/story-complete.spec.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 18],
      'max-depth': ['error', 5],
    },
  },
  {
    // Presentation / wiring shells: keep readable assembly helpers slightly larger.
    files: ['src/ui/**/*.ts', 'src/game/**/*.ts', 'src/rendering/**/*.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 45, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', 6],
    },
  },
  {
    // Hand-authored district layouts are data-heavy by nature.
    files: ['src/world/maps.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', 6],
    },
  },

  {
    files: ['src/systems/session.ts', 'src/rendering/world-view.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', 6],
    },
  },
);
