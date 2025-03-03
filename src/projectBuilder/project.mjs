/**
 * @typedef {import('../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('rollup').RollupOptions} RollupOptions
 * @typedef {import('rollup').InputOption} InputOption
 * @typedef {import('./project.types.js').CompileTypesType} CompileTypesType
 * @typedef {import('./project.types.js').CommandArgsType} CommandArgsType
 */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable security/detect-non-literal-fs-filename */
import { rollup, watch as rollupWatch } from 'rollup'; // @ts-ignore
import { mergeObjects } from '@arpadroid/tools/object';
import { readFileSync, existsSync, writeFileSync, cpSync, rmSync, readdirSync, mkdirSync } from 'fs';
import alias from '@rollup/plugin-alias';
import fs from 'fs';
import path from 'path';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { ThemesBundler } from '@arpadroid/stylesheet-bundler';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { log, logStyle } from '../utils/terminalLogger.mjs';
import ProjectTest from './projectTest.mjs';
import { glob } from 'glob';
import { dts } from 'rollup-plugin-dts';

const cwd = process.cwd();

/** @type {CommandArgsType} */ // @ts-ignore
const argv = yargs(hideBin(process.argv)).argv;
const SLIM = Boolean(argv.slim ?? process.env.slim);
const MINIFY = Boolean(argv.minify ?? process.env.minify);
const WATCH = Boolean(argv.watch ?? process.env.watch);
const STORYBOOK_PORT = argv.storybook ?? process.env.storybook;
const NO_TYPES = Boolean(argv.noTypes ?? process.env.noTypes);
const STYLE_PATTERNS = argv['style-patterns'];
const DEPENDENCY_SORT = [
    'module',
    'tools',
    'i18n',
    'ui',
    'context',
    'services',
    'resources',
    'lists',
    'navigation',
    'messages',
    'forms',
    'application'
];
const STYLE_SORT = ['ui', 'lists', 'navigation', 'messages', 'form'];
const VERBOSE = Boolean(argv.verbose ?? process.env.verbose);

class Project {
    ////////////////////////////////
    // #region INITIALIZATION
    ////////////////////////////////
    /**
     * Initializes a new project instance.
     * @param {string} name
     * @param {BuildConfigType} config
     */
    constructor(name, config = {}) {
        this.setConfig(config);
        this.name = name;
        /** @type {string[]} */
        this.i18nFiles = [];
        this.path = this.getPath();
        this.pkg = this.getPackageJson();
        this.scripts = this.pkg?.scripts ?? {};
    }

    static _getFileConfig() {
        const projectConfigPath = cwd + '/src/arpadroid.config.js';
        if (existsSync(projectConfigPath)) {
            return require(projectConfigPath).default;
        }
        return {};
    }

    getPackageJson() {
        return (
            existsSync(`${this.path}/package.json`) &&
            JSON.parse(readFileSync(`${this.path}/package.json`, 'utf8'))
        );
    }

    /**
     * Sets the project configuration.
     * @param {BuildConfigType} config
     */
    setConfig(config) {
        this.config = Object.assign(this.getDefaultConfig(), config);
    }

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

    async getFileConfig() {
        const configFile = `${this.path}/src/arpadroid.config.js`;
        return existsSync(configFile) ? (await import(configFile)).default : {};
    }

    validate() {
        if (!existsSync(this.path)) {
            log.error(`Project ${this.name} does not exist`);
            return false;
        }
        return true;
    }

    getPath() {
        if (this.config?.path) {
            return this.config.path;
        }
        const basename = path.basename(cwd);
        if (basename !== this.name) {
            return `${this.config?.basePath || ''}/node_modules/@arpadroid/${this.name}`;
        }
        return cwd;
    }

    // #endregion

    // #region ACCESSORS

    getScripts() {
        return this.pkg?.scripts;
    }

    hasStyles() {
        return this.getThemes().length > 0;
    }

    getThemesPath() {
        return `${this.path}/src/themes`;
    }

    getThemes() {
        const path = this.getThemesPath();
        return fs.existsSync(path) ? readdirSync(path) : [];
    }

    getModulePath() {
        if (this.name === 'module') {
            return this.path;
        }
        return `${this.path}/node_modules/@arpadroid/module`;
    }

    /**
     * Returns the arpadroid dependencies.
     * @param {string[]} sort
     * @returns {string[]}
     */
    getArpadroidDependencies(sort = DEPENDENCY_SORT) {
        const packages = Object.entries(this.pkg?.peerDependencies ?? {})
            .map(([name]) => name.startsWith('@arpadroid/') && name.replace('@arpadroid/', ''))
            .filter(Boolean);
        if (sort?.length) {
            /** @type {string[]} */
            const rv = [];
            sort.forEach(pkg => {
                if (packages.includes(pkg)) {
                    rv.push(pkg);
                    packages.splice(packages.indexOf(pkg), 1);
                }
            });
            // @ts-ignore
            return rv.concat(packages.filter(pkg => pkg !== false));
        }
        return /** @type {string[]} */ (packages.filter(pkg => pkg !== false));
    }

    async getBuildConfig(_config = {}) {
        this.fileConfig = (await this.getFileConfig()) || {};
        return mergeObjects(
            {
                buildJS: true,
                buildStyles: true,
                buildI18n: true,
                buildDeps: true,
                buildTypes: false,
                logHeading: true,
                ...this.fileConfig
            },
            _config
        );
    }

    test() {
        this.projectTest = new ProjectTest(this);
        return this.projectTest.test();
    }

    // #endregion

    // #region Install
    async install() {
        log.task(this.name, 'Installing project.');
        const cmd = `cd ${this.path} && npm install`;
        // wait until command has completed before returning.
        return new Promise((resolve, reject) => {
            const child = spawn(cmd, { shell: true, stdio: 'inherit' });
            child.on('close', code => {
                code === 0 ? resolve(true) : reject(new Error(`Failed to install ${this.name}`));
            });
        });
    }

    // #endregion Install

    ////////////////////////////
    // #region Build
    ////////////////////////////
    /**
     * Builds the project.
     * @param {BuildConfigType} _config
     * @returns {Promise<boolean>}
     */
    async build(_config = {}) {
        this.buildStartTime = Date.now();
        const config = await this.getBuildConfig(_config);
        const slim = config.slim ?? SLIM;
        this.logBuild(config);
        await this.cleanBuild(config);
        !slim && (await this.buildDependencies(config));
        await this.bundleStyles(config);
        await this.bundleI18n(config);
        process.env.ARPADROID_BUILD_CONFIG = JSON.stringify(config);
        const rollupConfigFile = `${this.path}/src/rollup.config.mjs`;
        const rollupConfig = fs.existsSync(rollupConfigFile) ? (await import(rollupConfigFile)).default : [];
        await this.rollup(rollupConfig, config);
        await this.buildTypes(rollupConfig, config);
        this.runStorybook(config);
        this.watch(rollupConfig, config);
        this.buildEndTime = Date.now();
        !slim && this.logBuildComplete();
        return true;
    }

    logBuildComplete() {
        log.task(
            this.name,
            logStyle.success(`Build complete in ${this.getBuildSeconds()} seconds, have a nice day ;)`)
        );
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

    /**
     * Builds the project types.
     * @param {RollupOptions[]} rollupConfig
     * @param {BuildConfigType} config
     * @returns {Promise<boolean>}
     */
    async buildTypes(rollupConfig, config) {
        if (config?.buildTypes !== true || NO_TYPES) {
            return true;
        }
        // logTask(this.name, 'Building types');
        await this.compileTypes();
        await this.compileTypeDeclarations(config);
        await this.addEntryTypesFile();
        await this.distTypes();
        return true;
        //  await this.rollupTypes(rollupConfig, config);
    }

    /**
     * Copies all types.d.ts files to the dist/@types directory maintaining the directory structure.
     * @param {CompileTypesType} config
     * @returns {Promise<unknown[]>}
     */
    async compileTypes(config = {}) {
        // Create the dist/@types directory if it does not exist.
        if (!fs.existsSync(`${this.path}/dist/@types`)) {
            fs.mkdirSync(`${this.path}/dist/@types`, { recursive: true });
        }

        // Get the input and destination directories.
        let { inputDir = this.path + '/src/', destination = this.path + '/.tmp/.types/' } = config;
        const { filePattern = '**/*.types.d.ts', prependFiles = [`${inputDir}types.d.ts`] } = config;
        !inputDir.endsWith('/') && (inputDir += '/');
        !destination.endsWith('/') && (destination += '/');

        // Get the files to copy.
        const files = [
            ...Array.from(prependFiles),
            ...(glob.sync(inputDir + filePattern, { cwd: this.path }) || [])
        ];
        // Copy the files to the destination directory.
        /** @type {Promise<unknown>[]} */
        const promises = [];
        files.forEach(async file => {
            const dest = file.replace(inputDir, destination);
            const dir = path.dirname(dest);
            !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
            promises.push(fs.promises.copyFile(`${file}`, dest));
        });

        return Promise.all(promises);
    }

    /**
     * Copies the directory .types to dist/@types.
     */
    async distTypes() {
        const typesPath = path.join(this.path + '/dist', '@types');
        if (!fs.existsSync(typesPath)) {
            fs.mkdirSync(typesPath, { recursive: true });
        }
        cpSync(`${this.path}/.tmp/.types`, typesPath, { recursive: true });
    }

    /**
     * Creates an types.d.ts file in the dist directory and writes the content to it.
     * @returns {Promise<boolean>}
     */
    async addEntryTypesFile() {
        const base = `${this.path}/.tmp/.types`;
        const indexFile = fs.existsSync(`${base}/index.d.ts`) ? `${base}/index.d.ts` : `${base}/index.d.mts`;
        const indexContents = readFileSync(indexFile, 'utf8');
        const typesContents = readFileSync(`${this.path}/.tmp/.types/types.d.ts`, 'utf8');
        const file = `${this.path}/.tmp/.types/types.compiled.d.ts`;
        const contents = `${indexContents}\n\n${typesContents}`;
        writeFileSync(file, contents);
        return true;
    }

    /**
     * Bundles the project using rollup.
     * @param {RollupOptions[]} rollupConfig
     * @param {BuildConfigType} config
     * @returns {Promise<boolean>}
     */
    async rollupTypes(rollupConfig, config) {
        const typesPath = path.join('src', 'types.d.ts');
        if (!fs.existsSync(typesPath)) {
            console.log('typesPath not found');
            return true;
        }
        const conf = {
            input: ['./dist/@types/types.compiled.d.ts'],
            output: {
                file: path.join('dist', 'types.d.ts'),
                /** @type {import('rollup').ModuleFormat} */
                format: 'es'
            },
            plugins: [dts({ respectExternal: config.slim })]
        };
        /** @type {RollupOptions} */
        return await this.rollup([conf], config, 'Rolling up types');
    }

    /**
     * Compiles the types for the project.
     * @param {BuildConfigType} _config
     * @returns {Promise<boolean>}
     */
    compileTypeDeclarations(_config) {
        const watchString = WATCH ? '--watch --preserveWatchOutput &' : '';
        const cmd = `cd ${this.path} && tsc -b --declaration --emitDeclarationOnly ${watchString}`;
        return new Promise((resolve, reject) => {
            const child = spawn(cmd, { shell: true, stdio: 'inherit' });
            child.on('close', code => {
                code === 0
                    ? resolve(true)
                    : reject(new Error(`Failed to compile types for ${this.name}. Exit code: ${code}`));
            });
        });
    }

    /**
     * Bundles the i18n files.
     * @param {BuildConfigType} config
     * @returns {Promise<boolean>}
     */
    async bundleI18n(config) {
        if (config?.buildI18n !== true) {
            return true;
        }
        const slim = config.slim ?? SLIM;
        if (slim) return true;
        const script = `${cwd}/node_modules/@arpadroid/i18n/scripts/compile.mjs`;
        const scriptExists = existsSync(script);
        if (scriptExists) {
            const compiler = await import(script);
            this.i18nFiles = await compiler.compileI18n(this);
        }
        return true;
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
    async cleanBuild({ slim }) {
        !slim && log.task(this.name, 'Cleaning up.');
        if (existsSync(`${this.path}/dist`)) {
            rmSync(`${this.path}/dist`, { recursive: true, force: true });
        }
        mkdirSync(`${this.path}/dist`, { recursive: true });
        return true;
    }

    /**
     * Runs the storybook.
     * @param {BuildConfigType} config
     * @returns {Promise<void>}
     */
    async runStorybook({ slim = SLIM }) {
        if (!STORYBOOK_PORT || slim) {
            return;
        }
        const cmd = await this.getStorybookCmd();
        spawn(cmd, { shell: true, stdio: 'inherit', cwd: this.path });
    }

    async getStorybookCmd() {
        const configPath = this.getStorybookConfigPath();
        return `node ./node_modules/@arpadroid/module/node_modules/storybook/bin/index.cjs dev -p ${STORYBOOK_PORT} -c "${configPath}"`;
    }

    getStorybookConfigPath() {
        const projectPath = `${this.path}/.storybook`;
        const arpadroidPath = `${this.path}/node_modules/@arpadroid/module/.storybook`;
        return existsSync(projectPath) ? projectPath : arpadroidPath;
    }

    /**
     * Builds the project dependencies.
     * @param {BuildConfigType} buildConfig
     * @returns {Promise<void>}
     */
    async buildDependencies(buildConfig) {
        if (buildConfig?.buildDeps !== true) {
            return;
        }
        log.task(this.name, 'Building dependencies.');
        const projects = this.createDependencyInstances();
        process.env.arpadroid_slim = 'true';

        const runPromises = async () => {
            for (const project of projects) {
                /** @type {BuildConfigType} */
                const config = {
                    slim: true,
                    isDependency: true,
                    parent: this.name
                };
                if (buildConfig.buildTypes === false) {
                    config.buildTypes = false;
                }
                await project.build(config);
            }
        };
        const rv = await runPromises().catch(err => {
            log.error(`Failed to build ${logStyle.subject(this.name)} dependencies`, err);
            return Promise.reject(err);
        });
        process.env.arpadroid_slim = '';
        return rv;
    }

    /**
     * Bundles the project styles.
     * @param {BuildConfigType} config
     * @returns {Promise<ThemesBundler | boolean>}
     */
    async bundleStyles(config = {}) {
        if (!config.buildStyles) {
            return true;
        }
        !config.slim && log.task(this.name, 'Bundling CSS.');
        const { path = this.path } = config;
        const minify = config.minify ?? MINIFY;
        let { style_patterns = STYLE_PATTERNS ?? [] } = config;
        if (typeof style_patterns === 'string') {
            style_patterns = style_patterns.split(',').map(pattern => pattern.trim());
        }
        style_patterns = style_patterns.map(pattern => `${this.path}/src/${pattern}`);
        const bundler = new ThemesBundler({
            exportPath: path + '/dist/themes',
            minify,
            patterns: [path + '/src/components/**/*', ...style_patterns],
            themes: this.getThemes().map(theme => ({ path: `${this.path}/src/themes/${theme}` }))
        });
        await bundler.initialize();
        return bundler;
    }

    createDependencyInstances() {
        return this.getArpadroidDependencies().map(
            packageName => new Project(packageName, { path: `${cwd}/node_modules/@arpadroid/${packageName}` })
        );
    }

    /**
     * Bundles the project using rollup.
     * @param {RollupOptions[]} rollupConfig
     * @param {BuildConfigType} config
     * @param {string} [heading]
     * @returns {Promise<boolean>}
     */
    async rollup(rollupConfig, config = {}, heading = 'Rolling up') {
        if (config?.buildJS !== true) {
            return true;
        }
        const { aliases = [] } = config;
        VERBOSE || (!config.slim && log.task(this.name, heading));
        const appBuild = rollupConfig[0];
        const plugins = appBuild.plugins;
        if (aliases?.length && Array.isArray(plugins)) {
            // @ts-ignore
            plugins?.push(alias({ entries: aliases }));
        }
        // @ts-ignore
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
    watch(rollupConfig, { watch = WATCH, slim }) {
        if (!watch) {
            return;
        }
        VERBOSE || (!slim && log.task(this.name, 'watching for file changes'));
        this.watcher = rollupWatch(rollupConfig);
        this.watcher.on('event', event => {
            if (event.code === 'ERROR') {
                log.error(`Error occurred while watching ${this.name}`, event.error);
            } else if (event.code === 'END') {
                // console.log(chalk.green(`Stopped watching ${chalk.magenta(this.name)}`));
            } else {
                VERBOSE && log.task(this.name, 'Got watch event');
            }
        });
        /**
         * Watches for file changes.
         * @param {{ result: { close: () => void }}} param0
         * @returns {void}
         */
        const watcherCallback = ({ result }) => result?.close();
        // @ts-ignore
        this.watcher.on('event', watcherCallback);
        !slim && this.runGuardLivereload();
    }

    runGuardLivereload() {
        if (existsSync(`${this.path}/Guardfile`)) {
            log.task(this.name, 'running guard livereload');
            spawn('guard', { shell: true, stdio: 'inherit', cwd: this.path });
        }
    }
    // #endregion

    // #region BUILD STYLES

    /**
     * Builds the project styles.
     * @param {BuildConfigType} config
     */
    buildStyles(config = {}) {
        const slim = config.slim ?? SLIM;
        if (slim) {
            return;
        }
        log.task(this.name, 'Compiling dependency styles.');
        const minifiedDeps = this.getStyleBuildFiles() ?? [];
        Object.entries(minifiedDeps).forEach(([theme, files]) => this.buildTheme(theme, files));

        if (this.getArpadroidDependencies().includes('ui')) {
            this.copyUIStyleAssets();
        }
    }

    getStyleBuildFiles() {
        if (!this.hasStyles()) {
            return false;
        }
        /** @type {Record<string, string[]>} */
        const minifiedDeps = {};
        this.getStylePackages().forEach(dep => {
            const project = new Project(dep);
            if (!project.hasStyles()) {
                return false;
            }
            const themes = project.getThemes();
            themes.forEach(theme => {
                !minifiedDeps[theme] && (minifiedDeps[theme] = []);
                minifiedDeps[theme].push(`${project.path}/dist/themes/${theme}/${theme}.min.css`);
            });
        });
        return minifiedDeps;
    }

    getStylePackages() {
        return [...this.getArpadroidDependencies(STYLE_SORT), this.name];
    }

    /**
     * Builds a theme from the given files.
     * @param {string} theme - The theme to build.
     * @param {string[]} files - The files to build the theme from.
     */
    buildTheme(theme, files) {
        const themePath = `${this.path}/dist/themes/${theme}`;
        let css = '';
        let bundledCss = '';
        files.forEach(file => {
            if (existsSync(file)) {
                css += readFileSync(file, 'utf8');
                const bundledFile = file.replace('.min.css', '.bundled.css');
                if (existsSync(bundledFile)) {
                    bundledCss += readFileSync(bundledFile, 'utf8');
                }
            } else {
                log.error(`Could not bundle file, ${chalk.magentaBright(file)} does not exist`);
            }
        });
        if (css) {
            if (!fs.existsSync(themePath)) {
                fs.mkdirSync(themePath, { recursive: true });
            }
            writeFileSync(`${themePath}/${theme}.final.css`, css);
        }
        if (bundledCss) {
            writeFileSync(`${themePath}/${theme}.bundled.final.css`, bundledCss);
        }
    }

    copyUIStyleAssets() {
        const uiPath = `${this.path}/node_modules/@arpadroid/ui`;
        cpSync(`${uiPath}/src/themes/default/fonts`, `${this.path}/dist/themes/default/fonts`, {
            recursive: true
        });
        cpSync(`${uiPath}/node_modules/material-symbols`, `${this.path}/dist/material-symbols`, {
            recursive: true
        });
    }

    // #endregion
}

export default Project;
