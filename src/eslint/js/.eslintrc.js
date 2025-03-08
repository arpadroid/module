import globals from 'globals';
import jsRules from './eslint-js.rules.js';
import tsRules from './eslint-ts.rules.js';

import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import babelEslintParser from '@babel/eslint-parser';
import eslintPluginFunctional from 'eslint-plugin-functional';
import eslintPluginImport from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';

import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import xss from 'eslint-plugin-xss';

// const compat = require('eslint-plugin-compat');
// const unicorn = require('eslint-plugin-unicorn');
// const noUnsanitized = require('eslint-plugin-no-unsanitized');
// const eslintPlugin = require('eslint-plugin-eslint-plugin');

const config = [
    {
        files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: babelEslintParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                },
                babelOptions: {
                    plugins: ['@babel/plugin-syntax-import-assertions']
                }
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                google: true
            }
        },
        plugins: {
            functional: eslintPluginFunctional,
            import: eslintPluginImport,
            jsdoc,
            security,
            sonarjs,
            xss
        },
        rules: {
            ...security.configs.recommended.rules,
            ...xss.configs.recommended.rules,
            ...sonarjs.configs.recommended.rules,
            ...jsRules
        }
    },
    {
        files: ['**/*.ts', '**/*.d.ts', '**/*.tsx'],
        languageOptions: {
            ecmaVersion: 'latest',
            parser: tsParser,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest
            }
        },
        plugins: {
            functional: eslintPluginFunctional,
            import: eslintPluginImport,
            '@typescript-eslint': ts,
            ts,
            jsdoc,
            sonarjs
        },
        rules: {
            ...ts.configs['eslint-recommended'].rules,
            ...ts.configs.recommended.rules,
            ...tsRules
        }
    }
];

export default config;
