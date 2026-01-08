/**
 * @typedef {import('../../project/project.mjs').default} Project
 */

import { compileStyles } from '../../project/helpers/projectStyles.helper.js';

/**
 * Creates a stylesheet out of any CSS files in the project.
 * @param {Project} project
 * @param {Record<string, unknown>} config
 * @returns {import('rollup').Plugin}
 */
export default function buildStyles(project, config) {
    return {
        name: 'build-styles',
        buildEnd() {
            compileStyles(project, config);
        }
    };
}
