/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('./projectBuilder.types.js').DependencyPointerType} DependencyPointerType
 * @typedef {import('../../../rollup/builds/rollup-builds.mjs').ProjectCliArgsType} ProjectCliArgsType
 * @typedef {import("../../../rollup/builds/rollup-builds.mjs").BuildConfigType} BuildConfigType
 * @typedef {import('../../../rollup/builds/rollup-builds.types.js').BuildHookNameType} BuildHookNameType
 */

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { existsSync, readFileSync, rmSync } from 'fs';
import { mergeObjects } from '@arpadroid/tools-iso';
import { log, logStyle } from '@arpadroid/logger';
import Project from '../../project.mjs';
import { getProject } from '../../projectStore.mjs';
import { basename, join } from 'path';
import { getJestTests, hasJestTests } from '../jest/projectJest.helper.js';
import { getStories, hasStories } from '../storybook/projectStorybook.helper.js';

/** @type {ProjectCliArgsType} */
export const argv = yargs(hideBin(process.argv)).argv;

export const NO_TYPES = Boolean(argv.noTypes);
export const STYLE_SORT = ['ui', 'lists', 'navigation', 'messages', 'form'];
export const DEPENDENCY_SORT = [
    'tools-node',
    'tools-iso',
    'signals',
    'logger',
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
export const STORYBOOK_PORT = Number(
    argv.storybook_port || process.env.STORYBOOK_PORT || argv.storybook || 6006
);
export const WATCH = Boolean(argv.watch);
export const BROWSERS = argv.browsers;
export const CI = Boolean(argv.ci);
const cwd = process.cwd();
////////////////////////////////
// #region Build  Config
////////////////////////////////

/**
 * Checks if the given project has any Jest / Storybook test files.
 * @param {Project} project
 * @returns {boolean}
 */
export function hasTests(project) {
    return hasJestTests(project) && hasStories(project);
}

/**
 * Returns an object containing arrays of Jest test files and Storybook story files for the given project.
 * @param {Project} project
 * @returns {{ jest: string[], stories: string[], totalTests: number }}
 */
export function getTests(project) {
    const jest = getJestTests(project);
    const stories = getStories(project);
    return {
        jest,
        stories,
        totalTests: jest.length + stories.length
    };
}

/**
 * Returns the default build configuration.
 * @param {Project} project
 * @returns {BuildConfigType}
 */
export function getDefaultBuildConfig(project) {
    /** @type {BuildConfigType} */
    const config = {
        buildDeps: true,
        buildI18n: true,
        buildJS: true,
        buildManifest: false,
        buildStyles: true,
        buildTypes: false,
        jest: {
            testMatch: ['<rootDir>/src/**/*.test.js']
        },
        logHeading: true,
        manifest: {
            useTypesChecker: true
        },
        minify: MINIFY,
        skipLibCheck: true,
        slim: SLIM,
        storybook_port: STORYBOOK,
        style_patterns: argv['style-patterns'],
        storybook: {
            stories: 'src/**/*.stories.{ts,tsx,js,jsx}'
        },
        turbo: true,
        verbose: Boolean(argv.verbose),
        watch: WATCH
    };
    return mergeObjects(config, project.config);
}

/**
 * Retrieves the project configuration for a project.
 * @param {Project} project
 * @returns {Promise<BuildConfigType>}
 */
export async function getFileConfig(project) {
    const { configPath } = project.config || {};
    const locations = [configPath, `${project.path}/src/arpadroid.config.js`];
    const configFile = locations.find(location => location && existsSync(location));
    if (!configFile) {
        log.error('Could not find configuration file, looked in the following locations:', locations);
        return Promise.resolve({});
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
    const fileConfig = (await getFileConfig(project)) || {};
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
export async function getPackageJson(path = cwd) {
    return existsSync(`${path}/package.json`) && JSON.parse(readFileSync(`${path}/package.json`, 'utf8'));
}

///////////////////////////////////////
// #region Dependencies
///////////////////////////////////////

/**
 * Returns arpadroid peer dependency package names, given a package.json parsed object.
 * @param {Project} project
 * @returns {DependencyPointerType[]}
 */
export function getDependencyPackages(project) {
    return Object.entries(project.pkg?.peerDependencies ?? {})
        .filter(([name]) => name.startsWith('@arpadroid/'))
        .map(([name]) => {
            const depName = name.replace('@arpadroid/', '');
            return {
                name: depName,
                path: `${project.path}/node_modules/@arpadroid/${depName}`
            };
        });
}

/**
 * Sorts the given dependency packages based on the provided sort order.
 * @param {DependencyPointerType[]} packages
 * @param {string[]} sort
 * @returns {DependencyPointerType[]}
 */
export function sortDependencies(packages, sort = DEPENDENCY_SORT) {
    if (sort?.length) {
        /** @type {Record<string, DependencyPointerType>} */
        const pkgMapObj = {};
        /** @type {Record<string, DependencyPointerType>} */
        const pkgMap = packages.reduce((map, pkg) => {
            map[pkg.name] = pkg;
            return map;
        }, pkgMapObj);
        /** @type {DependencyPointerType[]} */
        const rv = [];
        sort.forEach(pkgName => {
            const pkg = pkgMap[pkgName];
            if (!pkg) return;
            rv.push(pkg);
            packages.splice(packages.indexOf(pkg), 1);
        });
        return rv.concat(packages);
    }
    return packages;
}

/**
 * Returns arpadroid peer dependencies sorted by build priority.
 * @param {Project} project
 * @param {string[] | { sort?: string[] }} [sortOrOptions]
 * @returns {DependencyPointerType[]}
 */
export function getDependencies(project, sortOrOptions = DEPENDENCY_SORT) {
    const sort = Array.isArray(sortOrOptions) ? sortOrOptions : (sortOrOptions.sort ?? DEPENDENCY_SORT);
    const packages = getDependencyPackages(project);
    const existingNames = new Set(packages.map(pkg => pkg.name));

    for (const name of project.buildConfig?.deps ?? []) {
        if (!existingNames.has(name)) {
            packages.push({ name, path: `${project.path}/node_modules/@arpadroid/${name}` });
        }
    }
    return sortDependencies(packages, sort);
}

/**
 * Resolves dependencies recursively with cycle detection.
 * @param {Project} project
 * @param {Set<string>} visited
 * @param {number} depth
 * @param {number} maxDepth
 * @returns {Promise<DependencyPointerType[]>}
 */
export async function getDependenciesRecursive(project, visited, depth = 0, maxDepth = 10) {
    if (depth >= maxDepth) return [];
    /** @type {DependencyPointerType[]} */
    const results = [];
    await project.promise;
    const deps = getDependencies(project);

    for (const dep of deps) {
        if (visited.has(dep.name)) continue;
        visited.add(dep.name);
        const proj = getProject(dep.name, { path: dep.path });
        results.push(dep);
        dep.project = proj;
    }
    for (const dep of deps) {
        const { project: proj } = dep;
        const dps = !proj ? [] : await getDependenciesRecursive(proj, visited, depth + 1, maxDepth);
        results.push(...(dps || []));
    }

    return results;
}

/**
 * Recursively resolves all arpadroid dependencies including transitive dependencies.
 * @param {Project} project
 * @param {{ sort?: string[], maxDepth?: number }} [options]
 * @returns {Promise<DependencyPointerType[]>}
 */
export async function getAllDependencies(project, options = {}) {
    const { sort = DEPENDENCY_SORT, maxDepth = 10 } = options;
    const deps = await getDependenciesRecursive(project, new Set(), 0, maxDepth);
    return sortDependencies(deps, sort).filter(dep => project.name !== dep.name);
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
    const deps = await getAllDependencies(project);
    const projects = deps.map(dep => dep.project).filter(proj => proj instanceof Project);
    process.env.arpadroid_slim = 'true';
    const runPromises = async () => {
        for (const proj of projects) {
            await proj.promise;
            await buildDependency(proj, project, config);
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

//////////////////////////////
// #region Cleanup
///////////////////////////////

/**
 * Cleans up generated files and directories for the project.
 * @param {Project} project
 * @returns {Promise<boolean>}
 */
export async function cleanupFiles(project) {
    /**
     * We keep the list of files here, for security.
     */
    const files = [
        'dist',
        'node_modules',
        'package-lock.json',
        '.tmp',
        'coverage',
        'storybook-static',
        'debug-storybook.log'
    ];

    /** @type {string[]} */
    const filesRemoved = [];

    files.forEach(async _file => {
        const file = join(project?.path || cwd, _file);
        if (!file || !cwd || cwd === '' || !existsSync(file)) return;
        filesRemoved.push(file.replace(project.path || cwd, '.') + '  ✔️');
        await rmSync(file, { recursive: true, force: true });
    });

    filesRemoved.length && log.list(filesRemoved, { bullet: '🗑️ ' });

    return true;
}

// #endregion Cleanup

/**
 * Runs a build hook if defined.
 * @param {Project} project
 * @param {BuildHookNameType} hookName
 * @param {Record<string, unknown>} [payload]
 */
export async function runHook(project, hookName, payload = {}) {
    const config = project.buildConfig || {};
    const hook = config?.hooks?.[hookName];
    if (typeof hook === 'function') {
        try {
            /** @type {Promise<unknown> | unknown} */
            const rv = hook(project, payload);
            if (rv instanceof Promise) {
                await rv;
            }
        } catch (err) {
            log.error(`Error running hook ${hookName} for project ${project.name}:`, err);
        }
    }
}
