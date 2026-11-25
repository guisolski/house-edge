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
      'tools/**',
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
      complexity: ['error', 14],
    },
  },
  {
    // Browser evaluate payloads are intentionally self-contained.
    files: ['e2e/story-complete.spec.ts', 'e2e/story-walk.spec.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 320, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 42],
      'max-depth': ['error', 5],
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    // Presentation / wiring shells: keep readable assembly helpers slightly larger.
    files: ['src/ui/**/*.ts', 'src/game/**/*.ts', 'src/rendering/**/*.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 70, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', 6],
      complexity: ['error', 18],
    },
  },
  {
    files: ['src/systems/objectives.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 32, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Hand-authored district layouts are data-heavy by nature.
    files: ['src/world/maps.ts', 'src/world/slide.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', 7],
      complexity: ['error', 12],
    },
  },
  {
    // Skill phase tables + multi-phase duel defs are data-heavy.
    files: ['src/systems/minigame.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 240, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 16],
    },
  },
  {
    files: [
      'tests/unit/coverage-boost.test.ts',
      'tests/unit/session-skill.test.ts',
      'tests/unit/session-v141.test.ts',
      'tests/unit/minigame.test.ts',
      'tests/unit/session-v15.test.ts',
      'e2e/duel-needle.spec.ts',
    ],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 220, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 16],
    },
  },

  {
    files: ['src/systems/session.ts', 'src/rendering/world-view.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 55, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', 6],
      complexity: ['error', 18],
    },
  },
);
