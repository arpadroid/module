import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Project from '../src/projectBuilder/project.mjs';
const argv = yargs(hideBin(process.argv)).argv;
const cwd = process.cwd();

/**
 * Retrieves the project name from command line arguments or package.json.
 * @returns {string | undefined}
 */
export function getProjectName() {
    let PROJECT = argv.project;
    if (!PROJECT) {
        const pkgPath = join(cwd, 'package.json');
        if (existsSync(pkgPath)) {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
            PROJECT = pkg.name?.replace('@arpadroid/', '') || pkg.name;
        }
    }
    return PROJECT;
}

/**
 * Returns a project instance given a project name.
 * @param {string} [name]
 * @returns {Project}
 */
export function getProject(name = getProjectName()) {
    if (!name) {
        console.log('No project name could be determined.');
        process.exit(1);
    }
    return new Project(name);
}

/**
 * Determines whether to log the project heading based on command line arguments.
 * @returns {boolean}
 */
export function shouldLogHeading() {
    return (argv?.logHeading && argv.logHeading !== 'false') ?? true;
}
