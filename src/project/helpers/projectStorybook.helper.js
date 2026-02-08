/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../../rollup/builds/rollup-builds.mjs').BuildConfigType} BuildConfigType
 * @typedef {import('../project.mjs').default} Project
 */
import { spawn, execSync } from 'child_process';
import { existsSync, cpSync } from 'fs';
import { log } from '@arpadroid/logger';
import { isHTTPServerRunning, runServer, stopHTTPServer } from '@arpadroid/tools-node';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { join } from 'path';

const cwd = process.cwd();
const argv = /** @type {{watch?: boolean}} */ (yargs(hideBin(process.argv)).argv || {});

/////////////////////////////////
// #region Get
/////////////////////////////////

/**
 * Returns the storybook configuration path.
 * @param {Project} project
 * @returns {string}
 */
export function getStorybookConfigPath(project) {
    const locations = [`${project.path}/.storybook`, `${project.getModulePath()}/.storybook`];
    const loc = locations.find(location => existsSync(location));
    if (!loc) {
        log.error(`Storybook configuration not found for project "${project.name}"`);
    }
    return loc || `${project.path}/.storybook`;
}

// #endregion Get

/////////////////////////////////
// #region Scripts
/////////////////////////////////

/**
 * Returns the http-server script path.
 * @param {Project} project
 * @returns {string}
 */
export function getHTTPServerScript(project) {
    return `${project.getModulePath()}/node_modules/http-server/bin/http-server`;
}

/**
 * Returns the storybook script path.
 * @param {Project} project
 * @returns {string}
 */
export function getStorybookScript(project) {
    return `${project.getModulePath()}/node_modules/.bin/storybook`;
}

/**
 * Returns the Vitest script path.
 * @param {Project} project
 * @returns {string}
 */
export function getStorybookTestScript(project) {
    const modulePath = project.getModulePath();
    const script = `${modulePath}/node_modules/.bin/vitest`;
    return script;
}

/**
 * Returns the Vitest config path for Storybook tests.
 * @param {Project} project
 * @returns {string}
 */
export function getStorybookVitestConfigPath(project) {
    const modulePath = project.getModulePath();
    return `${modulePath}/src/storybook/vitest.config.mjs`;
}

// #endregion Scripts

/////////////////////////////
// #region Commands
/////////////////////////////

/**
 * Returns the http-server command.
 * @param {Project} project
 * @param {number} port
 * @returns {string}
 */
export function getHTTPServerCmd(project, port) {
    const httpScript = getHTTPServerScript(project);
    return `${httpScript} ./storybook-static -p ${port} --host 127.0.0.1 --silent`;
}

/**
 * Returns the storybook command.
 * @param {Project} project
 * @param {number} port
 * @returns {string}
 */
export function getStorybookCmd(project, port) {
    const configPath = getStorybookConfigPath(project);
    const script = getStorybookScript(project);
    return `node ${script} dev -p ${port} -c "${configPath}"`;
}

/**
 * Returns the storybook build command.
 * @param {Project} project
 * @returns {string}
 */
export function getStorybookBuildCmd(project) {
    const configPath = getStorybookConfigPath(project);
    const script = getStorybookScript(project);
    return `node ${script} build -c "${configPath}"`;
}

/**
 * Returns the Storybook Vitest test command.
 * @param {Project} project
 * @returns {string}
 */
export function getStorybookTestCmd(project) {
    const script = getStorybookTestScript(project);
    const vitestConfig = getStorybookVitestConfigPath(project);
    const run = !argv.watch ? '--run' : '';
    const watch = argv.watch ? '--watch' : '';
    return `${script} --project=storybook --config "${vitestConfig}" ${watch} ${run} `;
}

/**
 * Returns the storybook CI command.
 * @param {Project} project
 * @param {number} port
 * @returns {Promise<string>}
 */
export async function getStorybookCICmd(project, port) {
    const httpServerCmd = getHTTPServerCmd(project, port);
    const buildCmd = getStorybookBuildCmd(project);
    const path = project.path;
    const cmd = `cd ${path} && rm -rf ${path}/storybook-static && ${buildCmd} && ${httpServerCmd}`;
    return cmd;
}

// #endregion Commands

/////////////////////////////
// #region APIs
/////////////////////////////

/**
 * Runs the storybook.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @param {Record<string, unknown>} spawnConfig
 * @returns {Promise<any>}
 */
export async function runStorybook(project, { slim, storybook_port, verbose }, spawnConfig = {}) {
    if (!storybook_port || slim) return Promise.resolve(false);
    const port = storybook_port || 6006;
    const isServerRunning = await isHTTPServerRunning(port, 'localhost');
    if (isServerRunning) {
        log.task(project.name, `Stopping existing Storybook on port ${port}...`);
        await stopHTTPServer({ port });
    }
    const cmd = getStorybookCmd(project, storybook_port);
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, {
            shell: true,
            stdio: 'inherit',
            cwd: project.path,
            ...spawnConfig
        });
        child.on('message', message => {
            resolve(message);
            verbose && log.info('Message from Storybook process:' + message);
        });
        child.on('close', code => {
            resolve(code === 0);
        });
        child.on('error', err => reject(err));
    });
}

/**
 * Builds the storybook static site.
 * @param {Project} project
 * @param {{verbose?: boolean}} options
 * @returns {boolean}
 * @throws {Error}
 */
export function buildStorybook(project, { verbose } = {}) {
    try {
        log.task(project.name, 'Building Storybook...');
        execSync(getStorybookBuildCmd(project), {
            shell: '/bin/sh',
            stdio: verbose ? 'inherit' : 'ignore',
            cwd: project.path
        });
        return true;
    } catch (err) {
        log.error(`Storybook build failed for project "${project.name}": ${err}`);
        throw err;
    }
}

/**
 * Runs the storybook server in detached mode.
 * @param {Project} project
 * @param {number} port
 * @param {Record<string, unknown>} cmdConfig
 * @returns {Promise<import('child_process').ChildProcess>}
 */
export async function runStorybookServer(project, port, cmdConfig = {}) {
    // start http-server as a detached process so this function can return while the server continues
    return new Promise(resolve => {
        const cmd = getHTTPServerCmd(project, port);
        const child = runServer(cmd, { port, cmdConfig }, () => resolve(child));
        log.task(project.name, `Started http-server (pid ${child.pid})`);
    });
}

/**
 * Runs the storybook in CI mode: builds static site then launches http-server detached and waits until responsive.
 * @param {Project} project
 * @param {BuildConfigType} options
 * @param {Record<string, unknown>} spawnConfig
 * @returns {Promise<any>} Resolves with the pid of the http-server process.
 */
export async function runStorybookCI(project, options = {}, spawnConfig = {}) {
    const { verbose, storybook_port = 6666 } = options;
    buildStorybook(project, { verbose });
    return await runStorybookServer(project, storybook_port, spawnConfig);
}

/**
 * Runs the storybook tests using the Vitest addon.
 * @param {Project} project
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export async function runStorybookTests(project, port) {
    const STORYBOOK_CONFIG_DIR = getStorybookConfigPath(project);
    const cmd = getStorybookTestCmd(project);
    const child = spawn(cmd, [], {
        shell: '/bin/sh',
        stdio: 'inherit',
        cwd: project.path,
        env: {
            ...process.env,
            PROJECT_PATH: project.path,
            STORYBOOK_CONFIG_DIR,
            STORYBOOK_TEST: 'true',
            STORYBOOK_URL: `http://localhost:${port}`,
            STORYBOOK_PORT: String(port)
        }
    });

    return new Promise((resolve, reject) => {
        child.on('close', code => {
            if (code === 0) resolve(true);
            else reject(new Error('Storybook Vitest tests failed'));
        });
        child.on('error', err => reject(err));
    });
}

// #endregion APIs

//////////////////////////////
// #region Install
//////////////////////////////

/**
 * Checks if Storybook can be installed for the project based on its configuration and parent project.
 * @param {Project} moduleProject
 * @param {BuildConfigType} config
 * @returns {Promise<false|{parent?: Project, config?: BuildConfigType}>} A promise that resolves to the parent project if Storybook can be installed, false otherwise.
 */
export async function initializeInstall(moduleProject, config) {
    const { slim } = config;
    if (slim) {
        return false;
    }
    const parent = await moduleProject.getParentProject();
    if (parent.name === 'module') {
        return false;
    }
    await parent.promise;
    const parentConfig = await parent.getBuildConfig();
    return parentConfig.buildType === 'uiComponent' ? { parent, config: parentConfig } : false;
}

/**
 * Checks if Storybook configuration files exist in the project, otherwise creates them by copying from the appConfig directory.
 * @param {Project} moduleProject
 * @param {BuildConfigType} config
 * @returns {Promise<void>} A promise that resolves when the function is complete.
 */
export async function installStorybook(moduleProject, config) {
    const { parent } = (await initializeInstall(moduleProject, config)) || {};
    if (!parent) return;
    const configPath = join(parent?.path || cwd, '.storybook');
    const appConfigPath = join(moduleProject.path || cwd, 'src', 'storybook', 'appConfig');

    if (!existsSync(configPath)) {
        const filesPath = join(appConfigPath, '.storybook');
        log.task(moduleProject.name, 'Copying Storybook configuration files to project...');
        cpSync(filesPath, configPath, { recursive: true });
    }

    const vitestConfigPath = join(parent?.path || cwd, 'vitest.config.mjs');
    if (!existsSync(vitestConfigPath)) {
        const vitestConfigSrc = join(appConfigPath, 'vitest.config.mjs');
        log.task(
            moduleProject.name,
            `Copying Storybook Vitest configuration file "${parent?.name}" project...`
        );
        cpSync(vitestConfigSrc, vitestConfigPath);
    }
}

// #endregion Install
