/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../project.mjs').default} Project
 * @typedef {import('../../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 */

import { log } from '@arpadroid/logger';
import { cpSync, existsSync } from 'fs';
import { join } from 'path';

const cwd = process.cwd();

/**
 * Checks if Storybook configuration files exist in the project, otherwise creates them by copying from the appConfig directory.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<void>} A promise that resolves when the function is complete.
 */
export async function installStorybook(project, config) {
    const { slim } = config;
    const parent = await project.getParentProject();
    if (parent.name === 'module' || !slim) {
        return;
    }
    const configPath = join(parent.path || cwd, '.storybook');

    if (!existsSync(configPath)) {
        const filesPath = join(project.path || cwd, 'src', 'storybook', 'appConfig');
        log.task(project.name, 'Copying Storybook configuration files to project...');
        cpSync(filesPath, configPath, { recursive: true });
    }
}
