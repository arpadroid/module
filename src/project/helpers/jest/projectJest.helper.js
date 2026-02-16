/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../../../rollup/builds/rollup-builds.mjs').BuildConfigType} BuildConfigType
 * @typedef {import('../../project.mjs').default} Project
 * @typedef {import('../../project.types.js').ProjectTestConfigType} ProjectTestConfigType
 */

import fs, { copyFileSync, existsSync, globSync } from 'fs';
import { join, resolve } from 'path';
import { log } from '@arpadroid/logger';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { execSync } from 'child_process';
const cwd = process.cwd();

/** @type {ProjectTestConfigType} */
const argv = yargs(hideBin(process.argv)).argv;
const QUERY = argv.query ?? process.env.query ?? '';
const WATCH = Boolean(argv.watch ?? process.env.watch);
const COVERAGE = Boolean(argv.coverage ?? process.env.coverage);
/**
 * Returns path to the Jest script for the given project.
 * @param {Project} project
 * @returns {string}
 */
export function getJestScript(project) {
    return `${project.getModulePath()}/node_modules/jest/bin/jest.js`;
}

/**
 * Returns an array of paths to Jest test files for the given project.
 * @param {Project} project
 * @returns {string[]}
 */
export function getJestTests(project) {
    let patterns = project.buildConfig?.jest?.testMatch;
    if (!patterns) patterns = [`${project.path}/src/**/*.stories.{js,jsx,ts,tsx}`];
    if (patterns?.length && !Array.isArray(patterns)) patterns = [String(patterns)];
    /** @type {string[]} */
    const tests = [];
    Array.isArray(patterns) &&
        patterns?.forEach(_pattern => {
            const pattern = _pattern.replace('<rootDir>', project.path || cwd);
            const path = resolve(pattern);
            const found = globSync(path);
            tests.push(...found);
        });
    return tests;
}

/**
 * Returns an array of test match patterns for the Jest config.
 * @param {Project} project
 * @returns {Promise<string[]>}
 */
export async function getTestMatch(project) {
    let testMatch = project.buildConfig?.jest?.testMatch;
    if (testMatch instanceof Promise) testMatch = await testMatch;

    const patterns = /** @type {string[]} */ (testMatch || ['<rootDir>/src/**/*.test.js']);
    return patterns.map(pattern => {
        pattern = pattern.replace(project.path || cwd, '<rootDir>');
        return pattern;
    });
}

/**
 * Returns the number of Jest test files for the given project.
 * @param {Project} project
 * @returns {number}
 */
export function getTestCount(project) {
    return getJestTests(project).length;
}

/**
 * Checks if the given project has any Jest test files.
 * @param {Project} project
 * @returns {boolean}
 */
export function hasJestTests(project) {
    return getTestCount(project) > 0;
}

/**
 * Returns the path to the Jest configuration file for the given project.
 * @param {Project} project
 * @returns {string}
 */
export function getJestConfigPath(project) {
    const path = project.path || '';
    const modulePath = project.getModulePath() || '';
    const userConfig = join(path, 'jest.config.mjs');
    const moduleConfig = join(modulePath, 'src', 'jest', 'jest-global.config.mjs');
    const files = [userConfig, moduleConfig];
    const location = files.find(loc => fs.existsSync(loc));
    !location && log.info('No Jest configuration file found. Using default configuration from the module.');
    return location || '';
}

/**
 * Returns the command to run Jest tests for the given project and configuration.
 * @param {Project} project
 * @param {ProjectTestConfigType} [testConfig]
 * @returns {string}
 */
export function getJestCommand(project, testConfig = {}) {
    const binary = getJestScript(project);
    const jestConfigPath = getJestConfigPath(project);
    const { silent = false } = testConfig;
    /** @type {Record<string, string | unknown>} */
    const args = {
        coverage: COVERAGE,
        rootDir: project.path,
        config: jestConfigPath,
        testNamePattern: QUERY,
        watch: WATCH,
        silent
    };
    const argString = Object.keys(args)
        .filter(key => args[key])
        .map(key => {
            const value = typeof args[key] === 'boolean' ? '' : `=${args[key]}`;
            return `--${key}${value}`;
        })
        .join(' ');

    return `node --no-warnings --experimental-vm-modules ${binary} ${argString}`;
}

/**
 * Returns the path to the Jest setup file for the given project.
 * @param {Project} project
 * @returns {Promise<string[]>}
 */
export async function getJestSetupFiles(project) {
    await project?.promise;
    const modulePath = project?.getModulePath() || '';
    const localPath = join(project?.path || '', 'test', 'setupTests.mjs');
    const moduleSetupPath = join(modulePath, 'src', 'jest', 'jest.setup.mjs');
    const file = [localPath, moduleSetupPath].find(path => existsSync(path));
    return file ? [file] : [];
}

/**
 * Runs Jest tests for the given project and configuration.
 * @param {Project} project
 * @param {ProjectTestConfigType} [testConfig]
 * @returns {Promise<Buffer | string>}
 */
export async function runJestTests(project, testConfig = {}) {
    const cmd = getJestCommand(project, testConfig);
    return execSync(cmd, { shell: '/bin/sh', stdio: 'inherit', cwd: project.path });
}
/**
 * Checks if Storybook can be installed for the project based on its configuration and parent project.
 * @param {Project} moduleProject
 * @returns {Promise<false|{parent?: Project, config?: BuildConfigType}>} A promise that resolves to the parent project if Storybook can be installed, false otherwise.
 */
export async function initializeInstall(moduleProject) {
    const config = moduleProject?.buildConfig || {};
    const { slim } = config;
    if (!slim) return false;
    const parent = await moduleProject.getParentProject();
    await parent.promise;
    const parentConfig = await parent.getBuildConfig();
    return { parent, config: parentConfig };
}

/**
 * Installs Jest for the given project if it has Jest tests and no existing Jest configuration file.
 * @param {Project} moduleProject
 * @returns {Promise<boolean>}
 */
export async function installJest(moduleProject) {
    const payload = (await initializeInstall(moduleProject)) || {};
    const project = payload.parent || moduleProject;
    await project.promise;
    const configPath = join(project?.path || '', 'jest.config.mjs');
    if (!existsSync(configPath) && hasJestTests(project)) {
        const src = join(moduleProject.path || '', 'src', 'install', 'appConfig', 'jest.config.mjs');
        log.task(moduleProject.name, 'No Jest configuration found. Copying default configuration.');
        copyFileSync(src, configPath);
    }

    return true;
}
