/**
 * @typedef {import('./project.mjs').BuildConfigType} BuildConfigType
 */
import Project from './project.mjs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const argv = /** @type {Record<string, any>} */ (yargs(hideBin(process.argv)).argv);
const cwd = process.cwd();

/** @type {Record<string, Project>} */
const projectStore = {};
const PROJECT_STORE = projectStore;

export default PROJECT_STORE;
export { PROJECT_STORE };
/**
 * Retrieves the project name from command line arguments or package.json.
 * @returns {string | undefined}
 */
export function getProjectName() {
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        return pkg.name?.replace('@arpadroid/', '') || pkg.name;
    }
}

/**
 * Returns a project instance given a project name.
 * @param {string} [name]
 * @param {BuildConfigType} [config]
 * @param {{ create?: boolean }} [options]
 * @returns {Project | undefined}
 */
export function getProject(name = getProjectName(), config = {}, options = {}) {
    const { create = true } = options;
    if (!name) {
        console.log('No project name could be determined.');
        process.exit(1);
    }
    if (PROJECT_STORE[name]) return PROJECT_STORE[name];
    if (!create) return undefined;
    const project = new Project(name, config);
    PROJECT_STORE[name] = project;
    return project;
}

/**
 * Returns a project instance given a project name.
 * @param {string} [name]
 * @param {BuildConfigType} [config]
 * @param {{ create?: boolean }} [options]
 * @returns {Project}
 */
export function getProjectInstance(name, config, options = {}) {
    options.create = true;
    return /** @type {Project} */ (getProject(name, config, options));
}

/**
 * Determines whether to log the project heading based on command line arguments.
 * @returns {boolean}
 */
export function shouldLogHeading() {
    return (argv?.logHeading && argv.logHeading !== 'false') ?? true;
}
