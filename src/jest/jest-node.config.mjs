/**
 * @typedef {import('jest').Config} JestConfig
 */
import commonConfig from './jest-common.config.mjs';
import { mergeObjects } from '@arpadroid/tools-iso';

/** @type {JestConfig} */
const config = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.m?js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@arpadroid|chokidar|readdirp|anymatch|normalize-path|picomatch|glob-parent|braces|fill-range|to-regex-range|is-number|is-extglob|is-glob|chalk|glob|minimatch|yargs|yargs-parser)/)'
    ]
};

/** @type {JestConfig} */
export default mergeObjects(commonConfig, config);
