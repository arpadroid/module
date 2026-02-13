/**
 * @typedef {import('jest').Config} JestConfig
 */
import { getProject } from '../project/projectStore.mjs';
import { mergeObjects } from '@arpadroid/tools-iso';
import commonConfig from './jest-common.config.mjs';

const project = getProject();
if (!project) throw new Error('Project not found');

/** @type {JestConfig} */
const config = {
    testEnvironment: 'jsdom',
    transform: { '^.+\\.m?js$': 'babel-jest' }
};

/** @type {JestConfig} */
export default mergeObjects(commonConfig, config);
