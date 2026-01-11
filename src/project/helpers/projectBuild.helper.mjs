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
 * @returns {BuildConfigType}
 */
export function getDefaultBuildConfig() {
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
    return config;
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
 * @param {BuildConfigType} clientConfig
 * @param {string} projectPath
 * @returns {Promise<BuildConfigType>}
 */
export async function getBuildConfig(clientConfig = {}, projectPath = cwd()) {
    const fileConfig = (await getFileConfig(projectPath)) || {};
    const conf = mergeObjects(getDefaultBuildConfig(), fileConfig);
    /** @type {BuildConfigType} */
    const config = mergeObjects(conf, clientConfig);
    if (Boolean(argv.watch) === true && !config.slim) {
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
 * @param {Record<string, unknown>} pkg
 * @param {string[]} sort
 * @returns {string[]}
 */
export function getDependencies(pkg, sort = DEPENDENCY_SORT) {
    const packages = getDependencyPackages(pkg);
    return sortDependencies(packages, sort);
}

/**
 * Creates Project instances for each arpadroid dependency.
 * @param {Record<string, unknown>} pkg
 * @returns {Promise<Project[]>}
 */
export async function createDependencyInstances(pkg) {
    return getDependencies(pkg).map(
        packageName => new Project(packageName, { path: `${cwd()}/node_modules/@arpadroid/${packageName}` })
    );
}

/**
 * Builds a single dependency project.
 * @param {Project} project
 * @param {BuildConfigType} param1
 * @returns {Promise<boolean>}
 */
export async function buildDependency(project, { buildTypes }) {
    /** @type {BuildConfigType} */
    const config = {
        slim: true,
        isDependency: true,
        parent: project.name
    };
    if (buildTypes === false) {
        buildTypes = false;
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
    const projects = await createDependencyInstances(project.pkg);
    process.env.arpadroid_slim = 'true';
    const runPromises = async () => {
        for (const project of projects) {
            await buildDependency(project, { buildTypes: config.buildTypes });
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
