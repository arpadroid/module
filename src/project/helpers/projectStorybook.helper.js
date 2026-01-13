/**
 * @typedef {import('../../rollup/builds/rollup-builds.mjs').BuildConfigType} BuildConfigType
 * @typedef {import('../project.mjs').default} Project
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';

/**
 * Returns the storybook configuration path.
 * @param {Project} project
 * @returns {string}
 */
export function getStorybookConfigPath(project) {
    const projectPath = `${project.path}/.storybook`;
    const arpadroidPath = `${project.path}/node_modules/@arpadroid/module/.storybook`;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return existsSync(projectPath) ? projectPath : arpadroidPath;
}

/**
 * Returns the storybook command.
 * @param {Project} project
 * @param {number} port
 * @returns {string}
 */
export function getStorybookCmd(project, port) {
    const configPath = getStorybookConfigPath(project);
    return `node ./node_modules/@arpadroid/module/node_modules/storybook/bin/index.cjs dev -p ${port} -c "${configPath}"`;
}

/**
 * Runs the storybook.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<any>}
 */
export async function runStorybook(project, { slim, storybook_port }) {
    if (!storybook_port || slim) {
        return Promise.resolve(true);
    }
    const cmd = getStorybookCmd(project, storybook_port);
    return await spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: project.path });
}
