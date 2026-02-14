/**
 * @typedef {import('../project/project.mjs').default} Project
 * @typedef {import('../project/project.types.js').ProjectTestConfigType} ProjectTestConfigType
 * @typedef {import('../project/project.types.js').ProjectTestResponseType} ProjectTestResponseType
 */
import { execSync } from 'child_process';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { log, logStyle } from '@arpadroid/logger';
import { mergeObjects } from '@arpadroid/tools-iso';
import { stopHTTPServer } from '@arpadroid/tools-node';
import { runStorybookCI, runStorybookTests } from '../project/helpers/projectStorybook.helper.js';
import { getStorybookPort } from '../project/helpers/projectStorybook.helper.js';
import { runJestTests } from '../project/helpers/projectJest.helper.js';
import { getTests, runHook } from '../project/helpers/projectBuild.helper.mjs';

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
     * @param {ProjectTestConfigType} [testConfig]
     * @param {Project} [project]
     */
    logHeading(testConfig = {}, project = this.project) {
        const { logo } = project.buildConfig || {};
        const { silent = false } = testConfig;
        if (silent) return;
        log.arpadroid(logo);
        const subjectLog = logStyle.subject(`@arpadroid ${project?.name}`);
        console.log(logStyle.heading(`Testing: ${subjectLog}`));
    }

    /**
     * Returns the default test response object.
     * @returns {ProjectTestResponseType}
     */
    getDefaultTestResponse() {
        const count = { total: 0, failed: 0, passed: 0, skipped: 0 };
        return {
            success: true,
            count: { ...count },
            payloads: {
                hook: { payload: undefined, count: { ...count } },
                jest: { payload: undefined, count: { ...count } },
                storybook: { payload: undefined, count: { ...count } }
            }
        };
    }

    /**
     * Runs the tests.
     * @param {ProjectTestConfigType} [testConfig]
     * @param {Project} [proj]
     * @returns {Promise<boolean | unknown>}
     */
    async runTest(testConfig = {}, proj = this.project) {
        const {
            jest: hasJest = JEST,
            storybook: hasStorybook = STORYBOOK,
            slim: isSlim = SLIM,
            silent = false
        } = testConfig;
        /** @type {ProjectTestConfigType} */
        const config = mergeObjects(this.config, testConfig);
        const buildConfig = (await proj.getBuildConfig()) || {};

        this.logHeading(testConfig, proj);

        this.testInfo = getTests(proj);
        const { totalTests, stories, jest: jestTests } = this.testInfo;

        /** @type {ProjectTestResponseType} */
        const response = this.getDefaultTestResponse();

        const { hooks } = buildConfig;
        const hasHook = typeof hooks?.test === 'function';
        if (!totalTests && !hasHook) {
            !silent && log.info('Nothing to test');
            return true;
        }

        !isSlim && (await this.runTestBuild(testConfig));

        if (hasHook) {
            const hookRv = await runHook(proj, 'test', {
                testConfig: this.config,
                testInfo: this.testInfo
            });
            if (response.payloads.hook) {
                response.payloads.hook.payload = hookRv ?? {};
            }
        }

        if (hasJest && jestTests.length) {
            const jestResult = await this.testJest(testConfig);
            // @ts-ignore
            response.payloads.jest.payload = jestResult;
        }

        if (hasStorybook && stories.length) {
            await this.testStorybook(config);
        }

        !silent && log.success('Testing completed, have a nice day! 😀');
        return response;
    }

    /**
     * Runs the test build if needed. This can be used to build the project before running tests, which is useful for projects that need to be built before testing (e.g. Storybook). The `slim` option can be used to skip the build step if the project is already built and ready for testing.
     * @param {ProjectTestConfigType} [_testConfig]
     * @returns {Promise<Buffer | string | boolean>} The result of the build command, or true if the build was skipped.
     */
    async runTestBuild(_testConfig = {}) {
        const rv = await execSync('npm run build -- --logHeading=false', {
            shell: '/bin/sh',
            stdio: 'inherit',
            cwd: this.project.path,
            env: { ...process.env }
        });
        return rv;
    }

    // endregion Tests

    // #endregion Test NodeJS

    ////////////////////////////
    // #region Test Jest
    ///////////////////////////

    /**
     * Runs the jest tests.
     * @param {ProjectTestConfigType} [testConfig]
     * @returns {Promise<Buffer | string | boolean>}
     */
    async testJest(testConfig = {}) {
        log.task(this.project.name, 'Running jest tests.');
        return await runJestTests(this.project, testConfig);
    }

    /**
     * Runs the Storybook tests. This will start the Storybook server, run the tests, and then stop the server. The `storybook` option can be used to skip this step if Storybook tests should not be run.
     * @param {ProjectTestConfigType} [_testConfig]
     * @returns {Promise<boolean | Error>}
     */
    async testStorybook(_testConfig = this.config) {
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
