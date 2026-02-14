/**
 * @typedef {import('vitest/config').TestUserConfig['browser']} BrowserConfigOptions
 * @typedef {import('../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('rollup').RollupOptions} RollupOptions
 * @typedef {import('rollup').InputOption} InputOption
 * @typedef {import('../project/project.mjs').default} Project
 */

import { argv } from '../project/helpers/projectBuild.helper.mjs';

/**
 * Normalizes the browsers configuration by splitting a string of browser names into an array of strings.
 * @param {string | string[]} browsers
 * @returns {string[]}
 */
export function normalizeBrowsers(browsers) {
    if (typeof browsers === 'string') {
        browsers = browsers.split(' ');
    }
    if (Array.isArray(browsers)) {
        browsers = browsers.map(browser => browser.trim()).filter(Boolean);
    }
    return browsers;
}

/**
 * Gets the list of browsers to be used in CI testing.
 * @param {Project} project
 * @returns {string[]}
 */
export function getCIBrowsers(project) {
    const browsers = normalizeBrowsers(
        argv.ci_browsers || process.env.CI_BROWSERS || project.config?.test_browsers || 'chromium firefox'
    );
    return browsers;
}

/**
 * Returns the browsers configuration for testing.
 * @param {Project} project
 * @returns {BrowserConfigOptions[]}
 */
export function getBrowsersConfig(project) {
    /**
     * Browser coverage only allows chromium, so we limit to that if we run the tests in the browser.
     */
    const browsers = argv.project === 'storybook' ? getCIBrowsers(project) : ['chromium'];
    return browsers.map(browser => ({ browser, headless: true }));
}
