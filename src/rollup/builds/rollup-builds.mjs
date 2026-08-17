/**
 * @typedef {import('./rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('./rollup-builds.types.js').BuildInterface} BuildInterface
 * @typedef {import('./rollup-builds.types.js').AliasType} AliasType
 * @typedef {import('rollup').RollupOptions} RollupOptions
 * @typedef {import('rollup').Plugin} RollupPlugin
 * @typedef {import('../../project/project.types.js').CompileTypesType} CompileTypesType
 * @typedef {import('../../project/project.types.js').ProjectCliArgsType} ProjectCliArgsType
 */
/* eslint-disable security/detect-non-literal-fs-filename */
import { mergeObjects } from '@arpadroid/tools-iso';
import { logError } from '@arpadroid/logger';

import fs, { existsSync } from 'fs';
import path, { join } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
/**
 * Rollup plugins.
 */
import { bundleStats } from 'rollup-plugin-bundle-stats';
import { dts } from 'rollup-plugin-dts';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { visualizer } from 'rollup-plugin-visualizer';
import copy from 'rollup-plugin-copy';
import gzipPlugin from 'rollup-plugin-gzip';
import json from '@rollup/plugin-json';
import multiEntry from '@rollup/plugin-multi-entry';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import rollupAlias from '@rollup/plugin-alias';
import rollupWatch from 'rollup-plugin-watch';
import terser from '@rollup/plugin-terser';
import typescript from 'rollup-plugin-typescript2';

import Project from '../../project/project.mjs';
import { getProjectInstance } from '../../project/projectStore.mjs';
import { sendJsRefresh } from '../../storybook/vite/plugins/refreshPlugin.js';
import { manifestWatchPlugin } from '../../project/helpers/manifest/projectManifest.helper.mjs';

/** @type {ProjectCliArgsType} */
const argv = yargs(hideBin(process.argv)).parseSync() || {};
const cwd = process.cwd();
const DEPS = process.env.deps ?? argv?.deps ?? '';
const PROD = Boolean(process.env.production);
const SLIM = argv?.slim;
const WATCH = Boolean(!PROD && argv?.watch);

/**
 * Returns whether the build should be slim.
 * @returns {boolean}
 */
export function isSlim() {
    return Boolean((process.env.arpadroid_slim && process.env.arpadroid_slim === 'true') ?? SLIM);
}

/**
 * Returns whether the build should watch for changes.
 * @returns {boolean}
 */
export function shouldWatch() {
    return Boolean(process.env.arpadroid_watch ?? WATCH);
}

/**
 * Preprocesses the dependencies.
 * @param {string | string[]} deps
 * @returns {string[]}
 */
export function preProcessDependencies(deps = DEPS) {
    if (typeof deps === 'string') {
        deps = deps.split(',').map(dep => dep.trim());
    }
    return Array.isArray(deps) ? deps : [];
}

/**
 * Returns the build configuration.
 * @param {BuildConfigType} config
 * @returns {BuildConfigType}
 */
export function getBuildConfig(config = {}) {
    const envConfig = JSON.parse(process.env.ARPADROID_BUILD_CONFIG ?? '{}');
    const defaultConfig = mergeObjects(
        {
            slim: isSlim(),
            production: PROD,
            watch: shouldWatch()
        },
        envConfig
    );
    const rv = mergeObjects(defaultConfig, config);
    if (!rv.slim && DEPS) {
        rv.deps = preProcessDependencies(DEPS);
    }
    return rv;
}

/**
 * Logs the rollup build process.
 * @returns {RollupPlugin}
 */
export function debugPlugin() {
    return {
        name: 'debug',
        resolveId(source) {
            console.log('Resolving:', source);
            return null;
        },
        load(id) {
            console.log('Loading:', id);
            return null;
        }
    };
}

/**
 * Returns the configuration for the typescript types build.
 * @returns {RollupOptions}
 */
export function getTypesBuild() {
    const typesPath = path.join('src', 'types.d.ts');
    if (!fs.existsSync(typesPath)) {
        console.log('typesPath not found');
        return {};
    }
    /** @type {RollupOptions} */
    return {
        input: './src/types.d.ts',
        output: { file: join('dist', '@types', 'types.d.ts'), format: 'es' },
        plugins: [dts({ respectExternal: isSlim() })]
    };
}

/**
 * Returns the rollup input configuration.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {string | string[]}
 */
export function getInput(project, config = {}) {
    const { deps, slim } = config;
    const entry = join('src', 'index.js');
    if (!deps?.length || (slim && !config.requireDeps)) {
        return entry;
    }
    const rv = [entry];
    deps.forEach(async dep => {
        const base = join(project.path || '', 'node_modules', '@arpadroid');
        const distPath = join(base, dep, 'dist', `arpadroid-${dep}.js`);
        const nodePath = join(base, dep, 'src', 'index.js');
        const locations = [nodePath, distPath];
        const location = locations.find(loc => fs.existsSync(loc))?.replace(project.path + path.sep, '');
        if (location) {
            rv.push(location);
        } else {
            logError(`Dependency not found: ${dep}`, { location });
        }
    });
    return rv;
}

/**
 * Returns the aliases for the project dependencies.
 * @param {string} [projectName]
 * @param {string[] | import('./rollup-builds.types.js').AliasType[]} projects
 * @returns {RollupPlugin | undefined}
 */
export function getAliases(projectName, projects = []) {
    if (!Array.isArray(projects)) {
        logError('Invalid projects configuration, expecting an array instead got: ', projects);
    }
    const projectAlias = {
        find: `@arpadroid/${projectName}`,
        replacement: path.resolve(path.join('src', 'index.js'))
    };
    const copyAlias = {
        find: 'rollup-plugin-copy',
        replacement: path.join('node_modules', '@arpadroid', 'module', 'node_modules', 'rollup-plugin-copy')
    };
    /** @type {AliasType[]} */
    const aliases = [
        ...(projectName ? [projectAlias] : []),
        ...(projectName !== 'module' ? [copyAlias] : []),
        ...projects.map(dep => {
            if (typeof dep === 'string') {
                return {
                    find: `@arpadroid/${dep}`,
                    replacement: path.join(cwd, 'node_modules', '@arpadroid', dep, 'src', 'index.js')
                };
            }
            return dep;
        })
    ];
    return aliases?.length ? rollupAlias({ entries: aliases }) : undefined;
}

//////////////////////////////
// #region Plugins
//////////////////////////////

/**
 * Returns the slim build rollup plugins configuration.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {RollupPlugin[]}
 */
export function getSlimPlugins(project, config = {}) {
    const { parent, aliases = [], deps } = config;
    const plugins = [peerDepsExternal(), nodeResolve({ browser: true, preferBuiltins: false })];
    const _aliases = getAliases(parent, aliases);
    _aliases && plugins.push(_aliases);
    if (deps && deps.length > 0 && config.requireDeps) {
        // @ts-ignore - multiEntry does accept options, types may be mismatched
        plugins.push(multiEntry({ entryFileName: `arpadroid-${project.name}.js` }));
    }
    return plugins.filter(Boolean);
}

/**
 * Copies the test assets for storybook builds.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {{src: string, dest: string}[]}
 */
export function getTestAssetsCopyTargets(project, { storybook_port, copyTestAssets } = {}) {
    const targets = [];
    if (storybook_port && copyTestAssets) {
        targets.push({ src: 'node_modules/@arpadroid/module/test/test-assets/', dest: 'dist' });
    }
    if (existsSync(path.resolve(cwd, 'test', 'test-assets'))) {
        targets.push({ src: 'test/test-assets', dest: 'dist/' });
    }
    return targets;
}
/**
 * Returns a set of files to copy when the build happens.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {{src: string, dest: string}[]}
 */
export function getCopyTargets(project, config = {}) {
    const targets = [{ src: 'src/i18n', dest: 'dist' }, ...getTestAssetsCopyTargets(project, config)];
    return targets;
}

/**
 * Returns a plugin that logs the build end status.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {RollupPlugin}
 */
export function buildEndPlugin(project, { storybook_port } = {}) {
    return {
        name: 'close-end',
        writeBundle(_error) {
            if (project.name === 'ui') {
                return;
            }
            sendJsRefresh(project.name, storybook_port);
        }
    };
}

/**
 * Returns the fat build rollup plugins configuration.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {RollupPlugin[]}
 */
export function getFatPlugins(project, config) {
    const { deps, aliases, hasPlugin } = config;
    /** @type {(RollupPlugin  | any)[]} */
    const plugins = [
        nodeResolve({ browser: true, preferBuiltins: false }),
        terser({
            keep_classnames: false
        }),
        // @ts-ignore - multiEntry does accept options, types may be mismatched
        deps && deps?.length > 0 && multiEntry({ entryFileName: `arpadroid-${project.name}.js` }),
        hasPlugin?.bundleStats && bundleStats(),
        getAliases(project.name, aliases),
        copy({
            targets: getCopyTargets(project, config)
        }),
        visualizer({
            emitFile: true,
            filename: 'stats.html'
        }),
        buildEndPlugin(project, config)
    ];
    return plugins.filter(Boolean);
}

/**
 * Returns the rollup plugins configuration.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {RollupPlugin[]}
 */
export function getPlugins(project, config) {
    const { slim, plugins = [] } = config;
    return [
        nodePolyfills(),
        json(),
        ...(slim ? getSlimPlugins(project, config) : getFatPlugins(project, config)),
        gzipPlugin(),
        manifestWatchPlugin(project),
        ...plugins
    ].filter(Boolean);
}

// #endregion Plugins

/**
 * Returns the rollup output configuration.
 * @param {Project} project
 * @param {string | string[]} input
 * @returns {import('rollup').OutputOptions}
 */
export function getOutput(project, input) {
    const distDir = project.path ? path.join(project.path, 'dist') : 'dist';
    if (Array.isArray(input) && input.length > 1) {
        return {
            dir: distDir,
            format: 'esm',
            entryFileNames: `arpadroid-${project.name}.js`
        };
    }
    return {
        file: path.join(distDir, `arpadroid-${project.name}.js`),
        format: 'esm'
    };
}

/**
 * Returns the external dependencies.
 * @param {BuildConfigType} config
 * @returns {string[]}
 */
export function getExternal(config = {}) {
    const external = config?.external;
    if (isSlim()) {
        external?.push('context');
    }
    return (typeof external?.map === 'function' && external?.map(dep => `@arpadroid/${dep}`)) || [];
}

/**
 * Returns the default build configuration.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {import('rollup').RollupOptions}
 */
export function getBuildDefaults(project, config) {
    const input = getInput(project, config);
    const output = getOutput(project, input);
    return {
        input,
        plugins: getPlugins(project, config),
        external: getExternal(config),
        output,
        treeshake: true
    };
}

/**
 * A build type definition.
 * - `config`: build config defaults merged into the project's BuildConfigType. These defaults are
 *   applied before the project file config and client config, so both can still override them.
 * - `rollup`: returns the rollup input options for the build.
 * @typedef {object} RollupBuildType
 * @property {BuildConfigType} [config]
 * @property {(project: Project, config: BuildConfigType) => RollupOptions} [rollup]
 */

/**
 * Rollup builds.
 * The different builds that can be created for different applications.
 * @type {Record<string, RollupBuildType>}
 */
const rollupBuilds = {
    uiComponent: {
        config: {},
        rollup: (project, config = {}) => ({ ...getBuildDefaults(project, config) })
    },
    library: {
        config: {
            buildStyles: false,
            buildManifest: false,
            buildI18n: false,
            buildTypes: true,
            buildJS: false
        },
        rollup: (project, config = {}) => ({ ...getBuildDefaults(project, config) })
    }
};

/**
 * Returns the build configuration for the specified project and build.
 * @param {string} projectName
 * @param {BuildConfigType} config
 * @returns {BuildInterface }
 */
export function getBuild(projectName, config = {}) {
    const { buildType = 'library' } = config;
    const buildTypeConfig = rollupBuilds[buildType];
    if (typeof buildTypeConfig?.rollup !== 'function') {
        logError(`Invalid build name: ${buildType}`);
        return {};
    }
    const buildConfig = getBuildConfig(mergeObjects(buildTypeConfig.config || {}, config));
    const project = getProjectInstance(projectName, buildConfig);
    const appBuild = buildTypeConfig.rollup(project, buildConfig);
    const typesBuild = getTypesBuild();
    const build = [appBuild].filter(Boolean);
    if (!isSlim() && typeof buildConfig.processBuilds === 'function') {
        buildConfig.processBuilds(build);
    }

    return {
        build,
        appBuild,
        typesBuild,
        project,
        buildConfig,
        plugins: appBuild.plugins,
        output: appBuild.output,
        constants: project.getBuildConstants(),
        Plugins: {
            bundleStats,
            gzipPlugin,
            dts,
            multiEntry,
            json,
            nodeResolve,
            peerDepsExternal,
            alias: rollupAlias,
            watch: rollupWatch,
            debugPlugin,
            terser,
            copy,
            visualizer,
            typescript
        }
    };
}

export default rollupBuilds;
