/**
 * @typedef {import('vitest/config').TestUserConfig['browser']} BrowserConfigOptions
 * @typedef {import('../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('rollup').RollupOptions} RollupOptions
 * @typedef {import('rollup').InputOption} InputOption
 * @typedef {import('../project/project.mjs').default} Project
 */

import { BROWSERS } from '../project/helpers/projectBuild.helper.mjs';

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
 * Returns the browsers configuration for testing.
 * @param {Project} project
 * @returns {BrowserConfigOptions[]}
 */
export function getBrowsersConfig(project) {
    const browsers = normalizeBrowsers(
        BROWSERS || process.env.BROWSERS || project.config?.test_browsers || 'chromium firefox webkit'
    );
    return browsers.map(browser => ({ browser, headless: true }));
}
