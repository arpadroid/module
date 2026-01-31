/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('rollup').RollupOptions} RollupOptions
 * @typedef {import('rollup').InputOption} InputOption
 * @typedef {import('./project.types.js').CompileTypesType} CompileTypesType
 * @typedef {import('./project.types.js').ProjectCliArgsType} ProjectCliArgsType
 */

import path, { basename } from 'path';
import fs, { existsSync, rmSync, mkdirSync } from 'fs';
import { spawnSync } from 'child_process';

import { rollup, watch as rollupWatch } from 'rollup';
import alias from '@rollup/plugin-alias';

import { log, logStyle } from '@arpadroid/logger';
import ProjectTest from '../projectTest/projectTest.mjs';

import { DEPENDENCY_SORT, WATCH, MINIFY, SLIM, STORYBOOK } from './helpers/projectBuild.helper.mjs';
import { buildDependencies, getPackageJson, getDependencies } from './helpers/projectBuild.helper.mjs';
import { getBuildConfig } from './helpers/projectBuild.helper.mjs';

import { runStorybook } from './helpers/projectStorybook.helper.js';
import { buildTypes } from './helpers/projectTypes.helper.mjs';
import { bundleStyles } from './helpers/projectStyles.helper.js';
import PROJECT_STORE from './projectStore.mjs';

const cwd = process.cwd();
/** @type {ProjectCliArgsType} */

class Project {
    ////////////////////////////////
    // #region Initialization
    ////////////////////////////////
    /**
     * Initializes a new project instance.
     * @param {string} name
     * @param {BuildConfigType} config
     */
    constructor(name, config = {}) {
        this.name = name;
        PROJECT_STORE[name] = this;
        /** @type {Record<string, unknown>} */
        this.pkg = {};
        /** @type {import('rollup').RollupWatcher[]} */
        this.watchers = [];
        /** @type {import('rollup').RollupWatcher | undefined} */
        this.watcher = undefined;
        /** @type {string[]} */
        this.i18nFiles = [];
        this.setConfig(config);
        this.path = this.getPath();
        this.promise = this.initialize();
    }

    async initialize() {
        this.handleCloseSignal = this.handleCloseSignal.bind(this);
        process.on('SIGINT', this.handleCloseSignal);
        process.on('SIGTERM', this.handleCloseSignal);
        const promises = [this.initializePackageJson()];
        return Promise.all(promises);
    }

    initializePackageJson() {
        return getPackageJson(this.path).then(response => {
            this.pkg = response || {};
            this.scripts = this.pkg?.scripts ?? {};
            const result = this.validate();
            this.valid = result === true;
            if (!this.valid) {
                return Promise.reject(result.toString());
            }
            return Promise.resolve(response);
        });
    }

    // #endregion Initialization

    /////////////////////
    // #region Get
    /////////////////////

    /**
     * Returns the default project configuration.
     * @returns {BuildConfigType}
     */
    getDefaultConfig() {
        return {
            logHeading: true
        };
    }

    static async _getFileConfig(_cwd = cwd) {
        const projectConfigPath = _cwd + '/src/arpadroid.config.js';
        if (existsSync(projectConfigPath)) {
            return await import(projectConfigPath).then(mod => mod.default || {});
        }
        return {};
    }

    getDependencies(sortOrder = DEPENDENCY_SORT) {
        return getDependencies(this, sortOrder);
    }

    /**
     * Returns the project path.
     * @param {BuildConfigType} [config]
     * @param {string} [name]
     * @returns {string | undefined}
     */
    getPath(config = this.config, name = this.name) {
        const path = this.path || config?.path || (basename(cwd) === name && cwd) || '';
        const locations = [path, `${cwd}/node_modules/@arpadroid/${name}`];
        if (name === 'test-project') {
            locations.unshift(`${cwd}/test/${name}`);
        }
        if (basename(cwd) === name) {
            locations.unshift(cwd);
        }
        const location = locations.find(loc => existsSync(loc));
        if (location) return location;
        log.error(`Could not determine path for project ${name}`, {
            name,
            path,
            locations
        });
    }

    /**
     * Returns the project scripts.
     * @returns {Record<string, string | undefined>}
     */
    getScripts() {
        return /** @type {Record<string, string | undefined>} */ (this.pkg?.scripts || {});
    }

    /**
     * Returns the module path.
     * @param {string} [name]
     * @returns {string | undefined}
     */
    getModulePath(name = this.name) {
        const parent = this.buildConfig?.parent || name;
        const project = PROJECT_STORE[parent] || this;
        if (project.name === 'module') return project.path;
        return `${project.path}/node_modules/@arpadroid/module`;
    }

    /**
     * Returns the build configuration.
     * @param {BuildConfigType} clientConfig
     * @param {boolean} useCache
     * @returns {Promise<BuildConfigType>}
     */
    async getBuildConfig(clientConfig = {}, useCache = true) {
        if (useCache && this.buildConfig) {
            return this.buildConfig;
        }
        // await this.promise;
        this.buildConfig = await getBuildConfig(this, clientConfig);
        return this.buildConfig;
    }

    getBuildConstants() {
        return {
            SLIM,
            MINIFY,
            STORYBOOK
        };
    }

    /**
     * Returns the build time in seconds.
     * @returns {string | false | 0 | undefined}
     */
    getBuildSeconds() {
        return (
            this.buildEndTime &&
            this.buildStartTime &&
            ((this.buildEndTime - this.buildStartTime) / 1000).toFixed(2)
        );
    }

    // #endregion Get

    ////////////////////
    // #region Set
    ////////////////////

    /**
     * Sets the project configuration.
     * @param {BuildConfigType} config
     */
    setConfig(config) {
        this.config = Object.assign(this.getDefaultConfig(), config);
    }

    // #endregion Set

    /////////////////////
    // #region API
    ////////////////////

    validate() {
        if (!this.path || !existsSync(this.path)) {
            log.error(`Project ${this.name} does not exist`);
            return `Project ${this.name} does not exist`;
        }
        return true;
    }

    /**
     * Tests the project.
     * @param {import('./project.types.js').ProjectTestConfigType} config
     * @returns {Promise<boolean | unknown>}
     */
    test(config = {}) {
        this.projectTest = new ProjectTest(this);
        return this.projectTest.test(config);
    }

    // #endregion

    ////////////////////////////
    // #region Install
    ///////////////////////////

    getInstallCmd() {
        return `cd ${this.path} && rm -rf node_modules && rm package-lock.json && npm install && npm audit fix`;
    }

    async install() {
        log.task(this.name, 'Installing project.');
        return spawnSync(this.getInstallCmd(), { shell: true, stdio: 'inherit' });
    }

    // #endregion Install

    ////////////////////////////
    // #region Build
    ////////////////////////////
    /**
     * Builds the project.
     * @param {BuildConfigType} clientConfig
     * @returns {Promise<boolean>}
     */
    async build(clientConfig = {}) {
        this.buildStartTime = Date.now();
        const config = await this.getBuildConfig(clientConfig, false);
        this.buildConfig = config;
        const slim = config.slim;
        this.logBuild(config);
        await this.cleanBuild(config);
        await mkdirSync(`${this.path}/dist`, { recursive: true });
        if (!slim) {
            await this.buildDependencies(config);
        }
        await bundleStyles(this, config);
        await this.bundleI18n(config);
        process.env.ARPADROID_BUILD_CONFIG = JSON.stringify(config);
        const rollupConfig = await this.getRollupConfig();

        if (config.watch || WATCH) {
            await this.watch(rollupConfig, config, config.watchCallback);
        } else {
            await this.rollup(rollupConfig, config);
        }

        await buildTypes(this, config);
        runStorybook(this, config);
        this.buildEndTime = Date.now();
        !slim && this.logBuildComplete();
        return true;
    }

    async getRollupConfig() {
        const rollupConfigFile = `${this.path}/src/rollup.config.mjs`;
        return fs.existsSync(rollupConfigFile) ? (await import(rollupConfigFile)).default : [];
    }

    /**
     * Builds the project dependencies.
     * @param {BuildConfigType} buildConfig
     * @returns {Promise<boolean | void>}
     */
    async buildDependencies(buildConfig) {
        if (!buildConfig.buildDeps) return;
        log.task(this.name, 'Building dependencies.');
        const { promise, projects } = await buildDependencies(this, buildConfig);
        this.dependencyProjects = projects;
        return promise;
    }

    logBuildComplete() {
        log.task(
            this.name,
            logStyle.success(`Build complete in ${this.getBuildSeconds()} seconds, have a nice day ;)`)
        );
    }

    /**
     * Logs the build process.
     * @param {BuildConfigType} config
     * @returns {void}
     */
    logBuild(config) {
        const pkgName = '@arpadroid/' + this.name;
        if (!config?.slim) {
            config.logHeading && log.arpadroid(config.logo);
            console.log(logStyle.heading(`Building project: ${logStyle.pkg(pkgName)} ...`));
        } else {
            log.task(config?.parent ?? this.name, `Building ${logStyle.dep(pkgName)}.`);
        }
    }

    /**
     * Cleans up the build directory.
     * @param {BuildConfigType} config
     * @returns {Promise<boolean>}
     */
    async cleanBuild(config = {}) {
        !config?.slim && log.task(this.name, 'Cleaning up.');
        if (existsSync(`${this.path}/dist`)) {
            rmSync(`${this.path}/dist`, { recursive: true, force: true });
        }
        return true;
    }

    // #endregion Build

    /////////////////////////////
    // #region Rollup
    /////////////////////////////

    /**
     * Preprocesses rollup configs with resolved paths and aliases.
     * @param {RollupOptions[]} configs
     * @param {{ find: string | RegExp, replacement: string }[]} [aliases]
     */
    preprocessRollupConfigs(configs, aliases = []) {
        for (const conf of configs) {
            this.preprocessRollupConfig(conf);
        }
        if (aliases.length && Array.isArray(configs[0]?.plugins)) {
            configs[0].plugins.push(alias({ entries: aliases }));
        }
    }

    /**
     * Preprocesses a single rollup config with resolved paths.
     * @param {RollupOptions} conf
     */
    preprocessRollupConfig(conf) {
        // @ts-ignore - preProcessInputs handles the type conversion
        conf.input = this.preProcessInputs(conf.input);
        const output = conf?.output;
        if (output && !Array.isArray(output) && output.file) {
            // Only prepend path if output.file is a relative path
            if (!path.isAbsolute(output.file)) {
                output.file = `${this.path}/${output.file}`;
            }
        }
    }

    /**
     * Bundles a single rollup config.
     * @param {RollupOptions} conf
     */
    async bundleConfig(conf) {
        const bundle = await rollup(conf);
        if (!conf.output) return;
        const outputs = Array.isArray(conf.output) ? conf.output : [conf.output];
        for (const output of outputs) await bundle.write(output);
    }

    /**
     * Bundles the project using rollup.
     * @param {RollupOptions[]} configs
     * @param {BuildConfigType} config
     * @returns {Promise<boolean>}
     */
    async rollup(configs, config = {}) {
        if (config.buildJS !== true) return true;
        !config.slim && log.task(this.name, 'Rolling up');
        this.preprocessRollupConfigs(configs, config.aliases);
        await Promise.all(configs.map(conf => this.bundleConfig(conf)));
        return true;
    }

    /**
     * Preprocesses the input paths.
     * @param {InputOption | InputOption[] | undefined} inputs
     * @returns {InputOption | InputOption[] | undefined}
     */
    preProcessInputs(inputs) {
        if (Array.isArray(inputs)) {
            return inputs.map(input => this.preProcessInput(input));
        }
        return (inputs && this.preProcessInput(inputs)) || undefined;
    }

    /**
     * Preprocesses the input path.
     * @param {InputOption} input
     * @returns {InputOption}
     */
    preProcessInput(input) {
        if (typeof input === 'string' && input.startsWith('./')) {
            input = input.slice(2);
        }
        return `${this.path}/${input}`;
    }

    /**
     * Watches the project for file changes.
     * @param {RollupOptions[]} configs
     * @param {BuildConfigType} config
     * @param {(payload: Record<string, any>) => void} [callback]
     * @returns {Promise<boolean | import('rollup').RollupWatcher>}
     */
    async watch(configs, config, callback) {
        const { slim, verbose, aliases } = config;
        if (!configs?.length) return Promise.resolve(true);
        verbose || (!slim && log.task(this.name, 'watching for file changes'));
        this.preprocessRollupConfigs(configs, aliases);
        !slim && log.task(this.name, 'Rolling up (watch mode)');
        this.watcher = await rollupWatch(configs);

        return new Promise(resolve => {
            let initialized = false;
            this.watcher?.on('event', event => {
                if (event.code === 'BUNDLE_START' && verbose) {
                    log.task(this.name, 'Bundle started');
                }
                callback?.(event);
                if (!initialized && event.code === 'END') {
                    initialized = true;
                    resolve(/** @type {import('rollup').RollupWatcher} */ (this.watcher));
                }
            });
        });
    }

    // #endregion Rollup

    /////////////////////////////
    // #region i18n
    /////////////////////////////
    /**
     * Bundles the i18n files.
     * @param {BuildConfigType} config
     * @returns {Promise<boolean>}
     */
    async bundleI18n({ buildI18n, slim }) {
        if (buildI18n !== true || slim) return true;
        const locations = [
            `${this.path}/node_modules/@arpadroid/i18n/scripts/compile.mjs`,
            `${this.path}/node_modules/@arpadroid/module/node_modules/@arpadroid/i18n/scripts/compile.mjs`
        ];
        const loc = locations.find(async loc => await existsSync(loc));
        if (loc) {
            const compiler = await import(loc)
                .then(async response => {
                    this.i18nFiles = await compiler.compileI18n(this);
                    return Promise.resolve(response);
                })
                .catch(err => {
                    // log.error(`Failed to load i18n compiler for project ${this.name}`, err);
                    return Promise.resolve(err);
                });
        }
        return true;
    }

    // #endregion i18n

    /////////////////////////////
    // #region Cleanup
    /////////////////////////////

    /**
     * Closes all watchers and cleans up resources.
     * @returns {Promise<void>}
     */
    async close() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = undefined;
        }
        if (Array.isArray(this.watchers)) {
            for (const watcher of this.watchers) {
                if (typeof watcher?.close === 'function') {
                    watcher.close();
                }
            }
        }

        this.watchers = [];
        return Promise.resolve();
    }

    /**
     * Handles termination signals for cleanup.
     * @param {string} signal
     */
    async handleCloseSignal(signal) {
        try {
            if (!this.buildConfig?.isDependency) {
                log.task(this.name, 'Shutting down...');
            }
            await this.close();
        } catch (err) {
            console.log('ERROR');
            log.error(`Error during shutdown of project ${this.name}:`, {
                err,
                signal
            });
        } finally {
            if (!this.buildConfig?.isDependency) {
                log.success('Have a nice day ;)');
            }
            process.exit(0);
        }
    }

    // #endregion Cleanup
}

export default Project;
