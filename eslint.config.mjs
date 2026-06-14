import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

// FIX: Assign the configuration array to a named variable first to satisfy the linter
const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    // Combined and cleaned all duplicate ignores blocks into a single block
    ignores: [
      '.next/**/*',
      'node_modules/**/*',
      'out/**/*',
      'build/**/*',
      'linkFBtoMDB/**/*',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;
