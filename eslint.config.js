import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const sharedRules = {
  // Enforce no 'any' type
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'warn',
  '@typescript-eslint/no-unsafe-member-access': 'warn',
  '@typescript-eslint/no-unsafe-call': 'warn',
  '@typescript-eslint/no-unsafe-return': 'warn',

  // Best practices
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],

  // General rules
  'no-console': 'off',
  'no-unused-vars': 'off',
};

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  NodeJS: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  Promise: 'readonly',
};

const browserGlobals = {
  console: 'readonly',
  window: 'readonly',
  document: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  Promise: 'readonly',
  Response: 'readonly',
  Blob: 'readonly',
  HTMLElement: 'readonly',
  HTMLAnchorElement: 'readonly',
  React: 'readonly',
};

export default [
  eslint.configs.recommended,
  // Server/CLI TypeScript files (use root tsconfig)
  {
    files: ['src/**/*.ts'],
    ignores: ['src/presentation/web/client/**'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: nodeGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: sharedRules,
  },
  // Web client TypeScript/React files (use client tsconfig)
  {
    files: ['src/presentation/web/client/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './src/presentation/web/client/tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: browserGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: sharedRules,
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js', 'src/presentation/web/client/dist/**'],
  },
];
