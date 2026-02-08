/**
 * @typedef {import('./main.types.js').ResolutionTypes} ResolutionTypes
 * @typedef {import('./main.types.js').ResolutionType} ResolutionType
 */
import { join, resolve } from 'path';

const moduleRoot = resolve(import.meta.dirname, '../../..');
const addonVitestPath = resolve(moduleRoot, 'node_modules/@storybook/addon-vitest');

/** @type {ResolutionTypes} */
const resolutions = {
    '@storybook/web-components-vite': join(moduleRoot, 'node_modules/@storybook/web-components-vite'),
    '/node_modules/@arpadroid/module/.storybook/preview.js': 'virtual:preview-config',
    '@storybook/addon-vitest/internal/test-utils': join(addonVitestPath, 'dist/vitest-plugin/test-utils.js'),
    '@storybook/addon-vitest/internal/plugin': join(addonVitestPath, 'dist/vitest-plugin/plugin.js'),
    '@storybook/addon-vitest': addonVitestPath,
    '@storybook/builder-vite': join(moduleRoot, 'node_modules/@storybook/builder-vite'),
    'storybook/internal/preview/runtime': join(moduleRoot, 'node_modules/storybook/dist/preview/runtime.js'),
    'storybook/internal/csf': join(moduleRoot, 'node_modules/storybook/dist/csf/index.js'),
    'storybook/test': join(moduleRoot, 'node_modules/storybook/dist/test/index.js'),
    'vitest/internal/browser': join(moduleRoot, 'node_modules/vitest/dist/browser.js'),
    'vitest/runners': join(moduleRoot, 'node_modules/vitest/dist/runners.js'),
    'magic-string': join(moduleRoot, 'node_modules/magic-string'),
    chai: join(moduleRoot, 'node_modules/chai'),
    'expect-type': join(moduleRoot, 'node_modules/expect-type'),
    vitest: {
        find: /^vitest$/,
        replacement: join(moduleRoot, 'node_modules/vitest/dist/index.js')
    },
    playwright: join(moduleRoot, 'node_modules/playwright'), // Add Playwright resolution
    '@vitest/coverage-v8': join(moduleRoot, 'node_modules/@vitest/coverage-v8/dist')
};

/**
 * Converts the resolutions object into an array of alias objects for Vite.
 * @param {ResolutionType[]} aliases - The array to which the alias objects will be added.
 * @returns {ResolutionType[]} The array of alias objects.
 */
export function addAliasResolutions(aliases = []) {
    Object.keys(resolutions).forEach(key => {
        if (typeof resolutions[key] === 'string') {
            resolutions[key] = { replacement: resolutions[key] };
        }
        aliases.push({
            find: resolutions[key].find || key,
            replacement: resolutions[key].replacement
        });
    });
    return aliases;
}

export default resolutions;
