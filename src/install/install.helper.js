/**
 * @typedef {import("../rollup/builds/rollup-builds.types.js").BuildConfigType} BuildConfigType
 * @typedef {import("../project/project.mjs").default} Project
 */

import { installJest } from '../project/helpers/jest/projectJest.helper.js';
import { installStorybook } from '../project/helpers/storybook/projectStorybook.helper.js';

/**
 * @param {Project} project
 */
export async function install(project) {
    await installJest(project);
    await installStorybook(project);
}
