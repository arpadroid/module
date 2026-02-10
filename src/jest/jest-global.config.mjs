import { getProject } from '../project/projectStore.mjs';

const project = getProject();
await project?.promise;
const projectConfig = await project?.getBuildConfig();
const { buildType, jest } = projectConfig || {};
const environment = buildType === 'uiComponent' || jest?.environment === 'jsdom' ? 'jsdom' : 'node';
let config = {};
if (environment === 'jsdom') {
    config = (await import('@arpadroid/module/jest/config/jsdom')).default;
} else {
    config = (await import('@arpadroid/module/jest/config/node')).default;
}
export default config;
