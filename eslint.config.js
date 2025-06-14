// eslint.config.js

import path from 'node:path';

import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

import { includeIgnoreFile } from '@eslint/compat';

const __dirname = import.meta.dirname;
const gitignorePath = path.resolve(__dirname, '.gitignore');

/** @type {import('eslint').Linter.Config[]} */
export default [
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	includeIgnoreFile(gitignorePath),
	{ languageOptions: { globals: globals.node } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
];
