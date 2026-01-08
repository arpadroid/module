/* eslint-disable security/detect-non-literal-require */
/* eslint-disable security/detect-non-literal-fs-filename */

/**
 * @typedef {import('../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('rollup').RollupOptions} RollupOptions
 * @typedef {import('rollup').InputOption} InputOption
 * @typedef {import('./project.types.js').CompileTypesType} CompileTypesType
 * @typedef {import('./project.types.js').ProjectCliArgsType} ProjectCliArgsType
 */

import path from 'path';
import fs, { existsSync, rmSync, mkdirSync } from 'fs';
import { spawnSync } from 'child_process';

import { rollup, watch as rollupWatch } from 'rollup';
import alias from '@rollup/plugin-alias';

import { log, logStyle } from '../utils/terminalLogger.mjs';
import ProjectTest from '../projectTest/projectTest.mjs';
import { DEPENDENCY_SORT, getBuildConfig } from './helpers/projectBuild.helper.mjs';
import { buildDependencies, getPackageJson, getDependencies } from './helpers/projectBuild.helper.mjs';
import { runStorybook } from './helpers/projectStorybook.helper.js';
import { buildTypes } from './helpers/projectTypes.helper.mjs';
import { bundleStyles } from './helpers/projectStyles.helper.js';

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
        /** @type {Record<string, unknown>} */
        this.pkg = {};
        /** @type {string[]} */
        this.i18nFiles = [];
        this.setConfig(config);
        this.path = this.getPath();
        this._initialize();
    }

    _initialize() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        getPackageJson(this.path)
            .then(response => {
                this.pkg = response || {};
                this.scripts = this.pkg?.scripts ?? {};
                typeof this.resolve === 'function' && this.resolve(true);
            })
            .catch(error => {
                typeof this.reject === 'function' && this.reject(error);
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
            basePath: cwd,
            logHeading: true
        };
    }

    static _getFileConfig(_cwd = cwd) {
        const projectConfigPath = _cwd + '/src/arpadroid.config.js';
        if (existsSync(projectConfigPath)) {
            return require(projectConfigPath).default;
        }
        return {};
    }

    getDependencies(sortOrder = DEPENDENCY_SORT) {
        return getDependencies(this.pkg, sortOrder);
    }

    /**
     * Returns the project path.
     * @param {BuildConfigType} [config]
     * @param {string} [name]
     * @returns {string | undefined}
     */
    getPath(config = this.config, name = this.name) {
        if (this.path) return this.path;
        const { path: configPath, basePath = '' } = config || {};
        if (configPath) return configPath;
        if (path.basename(cwd) === name) {
            return cwd;
        }
        const locations = [`${cwd}/node_modules/@arpadroid/${name}`];
        if (basePath) {
            locations.unshift(`${basePath}/node_modules/@arpadroid/${name}`);
        }
        const location = locations.find(loc => existsSync(loc));
        if (location) return location;
        log.error(`Could not determine path for project ${name}`);
    }

    /**
     * Returns the project scripts.
     * @returns {Record<string, string | undefined>}
     */
    getScripts() {
        return /** @type {Record<string, string | undefined>} */ (this.pkg?.scripts || {});
    }

    getModulePath(name = this.name, path = this.path) {
        return name === 'module' ? path : `${path}/node_modules/@arpadroid/module`;
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
        this.buildConfig = await getBuildConfig(clientConfig, this.path);
        return this.buildConfig;
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
            return false;
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
        const rollupConfigFile = `${this.path}/src/rollup.config.mjs`;
        const rollupConfig = fs.existsSync(rollupConfigFile) ? (await import(rollupConfigFile)).default : [];
        await this.rollup(rollupConfig, config);
        await buildTypes(this, rollupConfig, config);
        runStorybook(this, config);
        this.watch(rollupConfig, config);
        this.buildEndTime = Date.now();
        !slim && this.logBuildComplete();
        return true;
    }

    /**
     * Builds the project dependencies.
     * @param {BuildConfigType} buildConfig
     * @returns {Promise<boolean | void>}
     */
    async buildDependencies(buildConfig) {
        buildConfig.buildDeps && log.task(this.name, 'Building dependencies.');
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
     * Bundles the project using rollup.
     * @param {RollupOptions[]} rollupConfig
     * @param {BuildConfigType} config
     * @param {string} [heading]
     * @returns {Promise<boolean>}
     */
    async rollup(rollupConfig, config = {}, heading = 'Rolling up') {
        const { slim, buildJS, verbose } = config;
        if (buildJS !== true) {
            return true;
        }
        const { aliases = [] } = config;
        verbose || (!slim && log.task(this.name, heading));
        const appBuild = rollupConfig[0];
        const plugins = appBuild?.plugins;
        if (aliases?.length && Array.isArray(plugins)) {
            plugins?.push(alias({ entries: aliases }));
        }
        /**
         * Maps the rollup configs.
         * @param {Record<string, any>} conf
         * @returns {Promise<boolean>}
         */
        const mapConfigs = async conf => {
            return new Promise(async resolve => {
                conf.input = this.preProcessInputs(conf.input);
                conf?.output?.file && (conf.output.file = `${this.path}/${conf.output.file}`);
                const bundle = await rollup(conf);
                if (conf.output) {
                    await bundle.write(conf.output);
                }
                resolve(true);
            });
        };
        await Promise.all(rollupConfig.map(mapConfigs));
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
     * @param {RollupOptions[]} rollupConfig
     * @param {BuildConfigType} config
     */
    watch(rollupConfig, { watch, slim, verbose }) {
        if (!watch) {
            return;
        }
        verbose || (!slim && log.task(this.name, 'watching for file changes'));
        this.watcher = rollupWatch(rollupConfig);
        this.watcher.on('event', event => {
            if (event.code === 'ERROR') {
                log.error(`Error occurred while watching ${this.name}`, event.error);
            } else if (event.code === 'END') {
                // console.log(chalk.green(`Stopped watching ${chalk.magenta(this.name)}`));
            } else {
                verbose && log.task(this.name, 'Got watch event');
            }
        });
        /**
         * Watches for file changes.
         * @param {Record<string, any>} param0
         * @returns {void}
         */
        const watcherCallback = ({ result }) => result?.close();

        this.watcher.on('event', watcherCallback);
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
        const script = `${cwd}/node_modules/@arpadroid/i18n/scripts/compile.mjs`;
        const scriptExists = existsSync(script);
        if (scriptExists) {
            const compiler = await import(script);
            this.i18nFiles = await compiler.compileI18n(this);
        }
        return true;
    }

    // #endregion i18n
}

export default Project;
