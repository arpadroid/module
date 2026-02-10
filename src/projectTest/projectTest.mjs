/* eslint-disable security/detect-non-literal-regexp */
/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../project/project.mjs').default} Project
 * @typedef {import('../project/project.types.js').ProjectTestConfigType} ProjectTestConfigType
 */
import { execSync } from 'child_process';
import { globSync } from 'glob';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { log, logStyle } from '@arpadroid/logger';
import { mergeObjects } from '@arpadroid/tools-iso';
import { stopHTTPServer } from '@arpadroid/tools-node';
import { getStorybookPort, runStorybookCI, runStorybookTests } from '../project/helpers/projectStorybook.helper.js';
import { runJestTests } from '../project/helpers/projectJest.helper.js';
import { getTests } from '../project/helpers/projectBuild.helper.mjs';

/** @type {ProjectTestConfigType} */
const argv = yargs(hideBin(process.argv)).argv;
const CI = Boolean(argv.ci ?? process.env.ci);
const QUERY = argv.query ?? process.env.query ?? '';
const STORYBOOK = Boolean(argv.storybook ?? process.env.storybook);
const JEST = Boolean(argv.jest ?? process.env.jest);
const BUILD = Boolean(argv.build ?? process.env.build);
const BROWSERS = argv.browsers ?? process.env.browsers ?? 'webkit chromium firefox';
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
        console.log(logStyle.heading(`Testing: ${subjectLog}`));

        this.testInfo = getTests(this.project);
        const { totalTests, stories, jest } = this.testInfo;

        if (!totalTests) {
            log.info('Nothing to test');
            return true;
        }
        if (!SLIM) {
            await execSync('npm run build -- --logHeading=false', {
                shell: '/bin/sh',
                stdio: 'inherit',
                cwd: this.project.path,
                env: { ...process.env }
            });
        }
        if (JEST && jest.length) {
            await this.testJest();
        }
        if (STORYBOOK && stories.length) {
            await this.testStorybook(config);
        }
        log.success(`Testing completed, have a nice day! 😀`);
        return this.testResponse;
    }

    // endregion Tests

    // #endregion Test NodeJS

    ////////////////////////////
    // #region Test Jest
    ///////////////////////////

    /**
     * Runs the jest tests.
     * @returns {Promise<Buffer | string | boolean>}
     */
    async testJest() {
        log.task(this.project.name, 'Running jest tests.');
        return await runJestTests(this.project);
    }

    async testStorybook(config = this.config) {
        const proj = this.project;
        const port = await getStorybookPort(proj);
        log.task(proj.name, 'Running storybook tests.');
        let started = false;
        try {
            await runStorybookCI(proj, { ...proj.buildConfig, storybook_port: port });
            started = true;
            return await runStorybookTests(proj, port);
        } finally {
            if (started) {
                try {
                    await stopHTTPServer({ port: Number(port) });
                } catch (error) {
                    log.error('Failed to stop Storybook http-server:', error);
                }
            }
        }
    }
}

export default ProjectTest;
