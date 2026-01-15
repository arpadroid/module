/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../../rollup/builds/rollup-builds.mjs').ProjectCliArgsType} ProjectCliArgsType
 * @typedef {import("../../rollup/builds/rollup-builds.mjs").BuildConfigType} BuildConfigType
 */

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { existsSync, readFileSync } from 'fs';
import { cwd } from 'process';
import { mergeObjects } from '../../utils/object.util.js';
import { Project } from '../../index.js';
import { log, logStyle } from '../../utils/terminalLogger.mjs';

/** @type {ProjectCliArgsType} */
const argv = yargs(hideBin(process.argv)).argv;

export const NO_TYPES = Boolean(argv.noTypes);
export const STYLE_SORT = ['ui', 'lists', 'navigation', 'messages', 'form'];
export const DEPENDENCY_SORT = [
    'module',
    'style-bun',
    'module',
    'tools',
    'i18n',
    'services',
    'context',
    'resources',
    'ui',
    'lists',
    'navigation',
    'messages',
    'forms',
    'gallery',
    'application'
];

export const MINIFY = Boolean(argv.minify);
export const SLIM = Boolean(argv.slim);
export const STORYBOOK = argv.storybook;

////////////////////////////////
// #region Build  Config
////////////////////////////////

/**
 * Returns the default build configuration.
 * @param {Project} project
 * @returns {BuildConfigType}
 */
export function getDefaultBuildConfig(project) {
    /** @type {BuildConfigType} */
    const config = {
        buildJS: true,
        buildStyles: true,
        buildI18n: true,
        buildDeps: true,
        buildTypes: false,
        logHeading: true,
        slim: SLIM,
        minify: MINIFY,
        style_patterns: argv['style-patterns'],
        verbose: Boolean(argv.verbose),
        storybook_port: STORYBOOK
    };
    return mergeObjects(config, project.config);
}

/**
 * Retrieves the project configuration for a project.
 * @param {string} projectPath
 * @returns {Promise<BuildConfigType>}
 */
export async function getFileConfig(projectPath = cwd()) {
    const configFile = `${projectPath}/src/arpadroid.config.js`;
    if (!existsSync(configFile)) {
        return {};
    }
    return await import(configFile).then(mod => mod.default || {});
}

/**
 * Returns the build configuration.
 * The order of precedence is (highest to lowest):
 * 1. CLI arguments.
 * 2. Configuration passed through the Project.build(config) method.
 * 3. Configuration returned from arpadroid.config.js file.
 * 4. Configuration passed through the constructor e.g., new Project(name, config).
 * 5. Default configuration defined in getDefaultBuildConfig().
 * @param {Project} project
 * @param {BuildConfigType} clientConfig
 * @param {ProjectCliArgsType} args
 * @returns {Promise<BuildConfigType>}
 */
export async function getBuildConfig(project, clientConfig = {}, args = argv) {
    const fileConfig = (await getFileConfig(project.path || cwd())) || {};
    const conf = mergeObjects(getDefaultBuildConfig(project), fileConfig);
    /** @type {BuildConfigType} */
    const config = mergeObjects(conf, clientConfig);
    if (args.watch && !config.slim) {
        config.watch = true;
    }
    if (typeof config.copyTestAssets === 'undefined') {
        config.copyTestAssets = config.buildType === 'uiComponent';
    }
    return config;
}

// #endregion Build Configuration

/**
 * Retrieves the package.json content for a project.
 * @param {string} path
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getPackageJson(path = cwd()) {
    return existsSync(`${path}/package.json`) && JSON.parse(readFileSync(`${path}/package.json`, 'utf8'));
}

///////////////////////////////////////
// #region Dependencies
///////////////////////////////////////

/**
 * Returns arpadroid peer dependency package names, given a package.json parsed object.
 * @param {Record<string, unknown>} pkg
 * @returns {string[]}
 */
export function getDependencyPackages(pkg) {
    return Object.entries(pkg?.peerDependencies ?? {})
        .map(([name]) => name.startsWith('@arpadroid/') && name.replace('@arpadroid/', ''))
        .filter(Boolean)
        .filter(pkg => pkg !== false);
}

/**
 * Sorts the given dependency packages based on the provided sort order.
 * @param {string[]} packages
 * @param {string[]} sort
 * @returns {string[]}
 */
export function sortDependencies(packages, sort = DEPENDENCY_SORT) {
    if (sort?.length) {
        /** @type {string[]} */
        const rv = [];
        sort.forEach(pkg => {
            if (packages.includes(pkg)) {
                rv.push(pkg);
                packages.splice(packages.indexOf(pkg), 1);
            }
        });
        return rv.concat(packages);
    }
    return packages;
}

/**
 * Returns arpadroid peer dependencies sorted by build priority, given a package.json parsed object.
 * @param {Project} project
 * @param {string[]} sort
 * @returns {string[]}
 */
export function getDependencies(project, sort = DEPENDENCY_SORT) {
    let packages = getDependencyPackages(project.pkg);
    if (project.buildConfig?.deps?.length) {
        packages = [...new Set([...packages, ...project.buildConfig.deps])];
    }
    return sortDependencies(packages, sort);
}

/**
 * Creates Project instances for each arpadroid dependency.
 * @param {string[]} deps
 * @param {string} projectPath
 * @returns {Promise<Project[]>}
 */
export async function createDependencyInstances(deps, projectPath = cwd()) {
    return deps.map(
        packageName =>
            new Project(packageName, { path: `${projectPath}/node_modules/@arpadroid/${packageName}` })
    );
}

/**
 * Builds a single dependency project.
 * @param {Project} project
 * @param {Project} parentProject
 * @param {BuildConfigType} parentConfig
 * @returns {Promise<boolean>}
 */
export async function buildDependency(project, parentProject, parentConfig) {
    /** @type {BuildConfigType} */
    const config = {
        slim: true,
        isDependency: true,
        parent: parentProject.name
    };
    if (parentConfig.buildTypes === false) {
        config.buildTypes = false;
    }
    return project.build(config);
}

/**
 * Builds the project dependencies.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<{promise: Promise<boolean>|void, projects?: Project[]}>}
 */
export async function buildDependencies(project, config) {
    if (config.buildDeps !== true) {
        return { promise: undefined };
    }
    const deps = getDependencies(project);
    const projects = await createDependencyInstances(deps, project.path);
    process.env.arpadroid_slim = 'true';
    const runPromises = async () => {
        for (const dep of projects) {
            await dep.promise;
            await buildDependency(dep, project, config);
        }
    };
    const promise = await runPromises().catch(err => {
        log.error(`Failed to build ${logStyle.subject(project.name)} dependencies`, err);
        return Promise.reject(err);
    });
    process.env.arpadroid_slim = '';
    return { promise, projects };
}

// #endregion Dependency Management
