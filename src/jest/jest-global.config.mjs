/**
 * @typedef {import('jest').Config} JestConfig
 */
import { getProject } from '../project/projectStore.mjs';

const project = getProject();
const projectConfig = await project?.getConfig();
const { buildType, jest } = projectConfig || {};
const environment = buildType === 'uiComponent' || jest?.environment === 'jsdom' ? 'jsdom' : 'node';

/** @type {JestConfig} */
let config = {};
if (environment === 'jsdom') {
    config = (await import('@arpadroid/module/jest/config/jsdom')).default;
} else {
    config = (await import('@arpadroid/module/jest/config/node')).default;
}

/** @type {JestConfig} */
export default { ...config };
