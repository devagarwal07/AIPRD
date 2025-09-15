import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'src/index.css'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
  '@typescript-eslint/no-unused-expressions': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  // Project-wide relaxations: allow empty catches (used for optional localStorage, telemetry) and permit 'any' in tests/interop
  'no-empty': ['warn', { allowEmptyCatch: true }],
  '@typescript-eslint/no-explicit-any': 'off',
  // Some generated regex strings include escapes that are harmless
  'no-useless-escape': 'off',
      // Quality / maintainability
  // Maintainability budgets (tightened)
  'complexity': ['warn', { max: 14 }],
  'max-lines': ['warn', { max: 450, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true, IIFEs: true }],
      'max-depth': ['warn', 5],
  'max-nested-callbacks': ['warn', 4],
      'eqeqeq': ['error', 'smart'],
      'prefer-const': ['warn', { destructuring: 'all' }],
  'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports', disallowTypeAnnotations: false }],
  '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
  '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
  '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
  ,
  // Node/server side overrides (allow console for server logs)
  {
    files: ['server/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'off',
      // Server can have longer files (allow bump) but still warn
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }]
    }
  }
  ,
  // Test files: relax some complexity / length rules
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', 'tests/**/*.{ts,tsx}'],
    rules: {
      'complexity': 'off',
      'max-lines': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  }
);
