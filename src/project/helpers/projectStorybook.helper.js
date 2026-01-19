/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../../rollup/builds/rollup-builds.mjs').BuildConfigType} BuildConfigType
 * @typedef {import('../project.mjs').default} Project
 */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { log } from '@arpadroid/logger';

/**
 * Returns the storybook configuration path.
 * @param {Project} project
 * @returns {string}
 */
export function getStorybookConfigPath(project) {
    const locations = [
        `${project.path}/.storybook`,
        `${project.path}/node_modules/@arpadroid/module/.storybook`
    ];
    const loc = locations.find(location => existsSync(location));
    if (!loc) {
        log.error(`Storybook configuration not found for project "${project.name}"`);
    }
    return loc || `${project.path}/.storybook`;
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
 * @param {Record<string, unknown>} spawnConfig
 * @returns {Promise<any>}
 */
export async function runStorybook(project, { slim, storybook_port, verbose }, spawnConfig = {}) {
    if (!storybook_port || slim) {
        return Promise.resolve(false);
    }
    const cmd = getStorybookCmd(project, storybook_port);
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, {
            shell: true,
            stdio: 'inherit',
            cwd: project.path,
            ...spawnConfig
        });

        child.on('error', error => {
            reject(error);
        });

        child.on('message', message => {
            if (verbose) {
                log.info('Message from Storybook process:' + message);
            }
        });

        child.on('close', code => {
            resolve(code);
        });
    });
}
