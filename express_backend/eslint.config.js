/** @type {import("eslint").FlatConfig[]} */
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

const ignoreConfig = {
  ignores: ['node_modules/**', 'dist/**', 'build/**', 'interfaces/**'],
};

const jsConfig = {
  files: ['**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'commonjs',
    globals: {
      ...globals.node,
    },
  },
  rules: {
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
  },
};

const tsConfig = {
  files: ['**/*.ts'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: tsParser,
    parserOptions: {
      // Keep this lightweight (no project references) to avoid CI issues if tsconfig changes.
      // If you want type-aware linting later, set `project: ['./tsconfig.json']`.
      project: null,
    },
    globals: {
      ...globals.node,
    },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
  },
  rules: {
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};

module.exports = [ignoreConfig, jsConfig, tsConfig];
