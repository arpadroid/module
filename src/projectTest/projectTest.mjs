/* eslint-disable security/detect-non-literal-regexp */
/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../project/project.mjs').default} Project
 * @typedef {import('../project/project.types.js').ProjectTestConfigType} ProjectTestConfigType
 */
import { execSync } from 'child_process';
import fs from 'fs';
import { globSync } from 'glob';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { log, logStyle } from '@arpadroid/logger';
import { mergeObjects } from '@arpadroid/tools-iso';
import { stopHTTPServer } from '@arpadroid/tools-node';
import { runStorybookTests } from '../project/helpers/projectStorybook.helper.js';

/** @type {ProjectTestConfigType} */
const argv = yargs(hideBin(process.argv)).argv;
const CI = Boolean(argv.ci ?? process.env.ci);
const WATCH = Boolean(argv.watch ?? process.env.watch);
const QUERY = argv.query ?? process.env.query ?? '';
const STORYBOOK = Boolean(argv.storybook);
const JEST = Boolean(argv.jest ?? process.env.jest);
const BUILD = Boolean(argv.build ?? process.env.build);
const BROWSERS = argv.browsers ?? process.env.browsers ?? 'webkit chromium firefox';
const PORT = argv.port ?? process.env.port ?? 6006;
const SLIM = Boolean(argv.slim ?? process.env.slim);

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
        this.initialize();
    }

    async initialize() {
        this.scripts = this.project.getScripts();
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
        const isFramework = this.project.name === 'framework';

        if (!isFramework && !this.stories?.length && !this.jestTests?.length) {
            log.info('Nothing to test');
            return true;
        }
        if (!SLIM) {
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
        const storybookPort = config.port || process.env.port || 6006;
        let ranStorybook = false;
        if (STORYBOOK && (this.stories?.length || isFramework)) {
            ranStorybook = true;
            await this.testStorybook(config);
        }
        // Ensure http-server is stopped after Storybook tests
        if (ranStorybook) {
            try {
                await stopHTTPServer({ port: Number(storybookPort) });
            } catch (error) {
                log.error('Failed to stop Storybook http-server:', error);
            }
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
        const modulePath = this.project.getModulePath();
        const binary = `${modulePath}/node_modules/jest/bin/jest.js`;
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
        const port = config?.port ?? PORT;
        // If there is a query then filter the stories to run only the ones that match the query.
        if (QUERY) {
            const query = new RegExp(QUERY, 'i');
            this.stories = this.stories.filter((/** @type {string} */ story) => query.test(story));
        }
        log.task(this.project.name, 'Running storybook tests.');
        return runStorybookTests(this.project, port);
    }

    // #endregion Test Storybook
}

export default ProjectTest;
