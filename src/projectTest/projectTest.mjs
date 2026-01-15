/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../project/project.mjs').default} Project
 * @typedef {import('../project/project.types.js').ProjectTestConfigType} ProjectTestConfigType
 */
/* eslint-disable security/detect-non-literal-regexp */
import { execSync } from 'child_process';
import fs from 'fs';
import { globSync } from 'glob';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { log, logStyle } from '../utils/terminalLogger.mjs';
import { mergeObjects } from '../utils/object.util.js';
import { getStorybookConfigPath } from '../project/helpers/projectStorybook.helper.js';

/** @type {ProjectTestConfigType} */
const argv = yargs(hideBin(process.argv)).argv;
const CI = Boolean(argv.ci ?? process.env.ci);
const WATCH = Boolean(argv.watch ?? process.env.watch);
const QUERY = argv.query ?? process.env.query ?? '';
const STORYBOOK = Boolean(argv.storybook ?? process.env.storybook);
const JEST = Boolean(argv.jest ?? process.env.jest);
const BUILD = Boolean(argv.build ?? process.env.build);
const BROWSERS = argv.browsers ?? process.env.browsers ?? 'webkit chromium firefox';
const PORT = argv.port ?? process.env.port ?? 6006;

class ProjectTest {
    //////////////////////////////
    // #region Initialization
    /////////////////////////////

    testResponse = { success: true, message: '', payloads: [] };

    /**
     * Creates a new ProjectTest instance.
     * @param {Project} project
     * @param {ProjectTestConfigType} [config]
     */
    constructor(project, config = {}) {
        /** @type {Project} */
        this.project = project;
        this.setConfig(config);
        const modulePath = this.project.getModulePath();
        this.scripts = this.project.getScripts();
        this.pm2 = modulePath + '/node_modules/pm2/bin/pm2';
        this.sb = modulePath + '/node_modules/.bin/storybook';
        this.httpServer = modulePath + '/node_modules/http-server/bin/http-server';
    }

    // #endregion

    ////////////////////////////
    // #region Get/Set
    ///////////////////////////

    setConfig(config = {}) {
        this.config = mergeObjects(this.getDefaultConfig(), config);
    }

    getDefaultConfig() {
        return { storybook: STORYBOOK, jest: JEST, ci: CI, query: QUERY, browsers: BROWSERS, build: BUILD };
    }

    // #endregion Get/Set

    ////////////////////////////
    // #region Tests
    ///////////////////////////

    /**
     * Tests the project.
     * @param {ProjectTestConfigType} [_config]
     * @returns {Promise<boolean | unknown>}
     */
    async test(_config = {}) {
        try {
            return await this.runTest(_config);
        } catch (error) {
            log.error(String(error));
            return {
                success: false,
                message: error?.toString() || 'An error occurred',
                payloads: []
            };
        }
    }

    /**
     * Runs the tests.
     * @param {ProjectTestConfigType} [_config]
     * @returns {Promise<boolean | unknown>}
     */
    async runTest(_config = {}) {
        /** @type {ProjectTestConfigType} */
        const config = mergeObjects(this.config, _config);
        const buildConfig = await this.project.getBuildConfig();
        log.arpadroid(buildConfig?.logo);
        const subjectLog = logStyle.subject(`@arpadroid ${this.project?.name}`);
        this.stories = (config.storybook && globSync(`${this.project.path}/src/**/*.stories.js`)) || [];
        this.jestTests = (config.jest && globSync(`${this.project.path}/src/**/*.test.js`)) || [];
        console.log(logStyle.heading(`Testing: ${subjectLog}`));

        if (!this.stories?.length && !this.jestTests?.length) {
            log.info('Nothing to test');
            return true;
        }
        if (config.ci && this.scripts?.build) {
            await execSync('npm run build -- --logHeading=false', {
                shell: '/bin/sh',
                stdio: 'inherit',
                cwd: this.project.path
            });
        }
        await this.testNodeJS(config);

        if (config.jest && this.jestTests?.length) {
            await this.testJest(config);
        }
        if (config.storybook && this.stories?.length) {
            await this.testStorybook(config);
        }
        return this.testResponse;
    }

    // endregion Tests

    ////////////////////////////
    // #region Test NodeJS
    ///////////////////////////

    /**
     * Tests the node.js scripts.
     * @param {ProjectTestConfigType} _config
     * @returns {Promise<boolean | unknown>}
     */
    async testNodeJS(_config) {
        const file = `${this.project.path}/test/test.mjs`;
        if (!fs.existsSync(file)) {
            return true;
        }
        const script = `node ${file}`;
        log.task(this.project.name, 'Running node tests');
        return execSync(script, { shell: '/bin/sh', stdio: 'inherit', cwd: this.project.path });
    }

    // #endregion Test NodeJS

    ////////////////////////////
    // #region Test Jest
    ///////////////////////////

    /**
     * Runs the jest tests.
     * @param {ProjectTestConfigType} _config
     * @returns {Promise<Buffer | string>}
     */
    async testJest(_config) {
        const binary = this.project.getModulePath() + '/node_modules/jest/bin/jest.js';
        let script = `node --experimental-vm-modules ${binary} --coverage --rootDir="${this.project.path}" --config="${this.getJestConfigLocation()}"`;
        QUERY && (script += ` --testNamePattern="${QUERY}"`);
        WATCH && (script += ' --watch');
        log.task(this.project.name, 'running jest tests');
        return execSync(script, { shell: '/bin/sh', stdio: 'inherit', cwd: this.project.path });
    }

    getJestConfigLocation() {
        const path = this.project.path;
        if (fs.existsSync(`${path}/jest.config.mjs`)) {
            return `${path}/jest.config.mjs`;
        }
        if (fs.existsSync(`${path}/jest.config.cjs`)) {
            return `${path}/jest.config.cjs`;
        }
        if (fs.existsSync(`${path}/jest.config.js`)) {
            return `${path}/jest.config.js`;
        }
        return `${path}/node_modules/@arpadroid/module/src/jest/jest.config.mjs`;
    }

    // #endregion Test Jest

    ////////////////////////////
    // #region Test Storybook
    ///////////////////////////

    async testStorybook(config = this.config) {
        const watch = WATCH ? ' --watch ' : '';
        const configPath = getStorybookConfigPath(this.project);
        const executable = `${this.project.getModulePath()}/node_modules/@storybook/test-runner/dist/test-storybook`;
        const script = `${executable} -c ${configPath} --maxWorkers=9 ${watch} --browsers ${config?.browsers ?? 'chromium'} --url="http://127.0.0.1:${PORT}"`;

        /**
         * If there is a query then filter the stories to run only the ones that match the query.
         */
        if (QUERY) {
            const query = new RegExp(QUERY, 'i');
            this.stories = this.stories.filter((/** @type {string} */ story) => query.test(story));
        }

        /**
         * If CI is true then start the storybook server.
         */
        if (config?.ci) {
            await this.stopStorybookCI();
            await this.startStorybookCI();
        }
        // run storybook test-runner
        log.task(this.project.name, 'Running storybook tests.');
        execSync(`node ${script} -c ${configPath}`, {
            shell: '/bin/sh',
            stdio: 'inherit',
            cwd: this.project.path
        });
        if (config?.ci) {
            await this.stopStorybookCI();
        }
    }

    async startStorybookCI() {
        const configPath = getStorybookConfigPath(this.project);
        const cmd =
            `cd ${this.project.path} && rm -rf ${this.project.path}/storybook-static && ` +
            `${this.sb} build -c ${configPath} && ${this.pm2} start ${this.httpServer} --name 'srv-storybook' -- ./storybook-static --port ${PORT} --host 127.0.0.1 --silent`;
        return execSync(cmd, { shell: '/bin/sh', stdio: 'inherit', cwd: this.project.path });
    }

    isStorybookCIRunning() {
        const processExists = Boolean(execSync(`${this.pm2} pid srv-storybook`).toString().trim());
        return processExists;
    }

    async stopStorybookCI() {
        if (!this.isStorybookCIRunning()) {
            return Promise.resolve();
        }
        return execSync(`${this.pm2} stop srv-storybook && ${this.pm2} delete srv-storybook`, {
            shell: '/bin/sh',
            stdio: 'inherit',
            cwd: this.project.path
        });
    }
    // #endregion Test Storybook
}

export default ProjectTest;
