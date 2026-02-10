/**
 * @typedef {import("../rollup/builds/rollup-builds.types.js").BuildConfigType} BuildConfigType
 * @typedef {import("../project/project.mjs").default} Project
 */

import { installJest } from '../project/helpers/projectJest.helper.js';
import { installStorybook } from '../project/helpers/projectStorybook.helper.js';

/**
 * @param {Project} project
 * @param {BuildConfigType} config
 */
export async function install(project, config) {
    await installJest(project, config);
    await installStorybook(project, config);
}
