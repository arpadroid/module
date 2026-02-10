/**
 * @typedef {import('./main.types.js').ResolutionTypes} ResolutionTypes
 * @typedef {import('./main.types.js').ResolutionType} ResolutionType
 */
import { join, resolve } from 'path';

const moduleRoot = resolve(import.meta.dirname, '../../..');
const addonVitestPath = join(moduleRoot, 'node_modules', '@storybook', 'addon-vitest', 'dist');
const modulesRoot = join(moduleRoot, 'node_modules');
const storybookPath = join(modulesRoot, 'storybook', 'dist');
const vitestPath = join(modulesRoot, 'vitest', 'dist');

/** @type {ResolutionTypes} */
const resolutions = {
    '@storybook/web-components-vite': join(modulesRoot, '@storybook', 'web-components-vite'),
    '/node_modules/@arpadroid/module/.storybook/preview.js': 'virtual:preview-config',
    'storybook/internal/preview/runtime': join(storybookPath, 'preview', 'runtime.js'),
    'storybook/internal/csf': join(storybookPath, 'csf', 'index.js'),
    'storybook/test': join(storybookPath, 'test', 'index.js'),
    '@storybook/builder-vite': join(modulesRoot, '@storybook', 'builder-vite'),
    'vitest/internal/browser': join(vitestPath, 'browser.js'),
    'vitest/runners': join(vitestPath, 'runners.js'),
    'magic-string': join(modulesRoot, 'magic-string'),
    chai: join(modulesRoot, 'chai'),
    'expect-type': join(modulesRoot, 'expect-type'),
    vitest: {
        find: /^vitest$/,
        replacement: join(vitestPath, 'index.js')
    },
    playwright: join(modulesRoot, 'playwright'),
    '@storybook/addon-vitest/internal/test-utils': join(addonVitestPath, 'vitest-plugin', 'test-utils.js'),
    '@storybook/addon-vitest/internal/plugin': join(addonVitestPath, 'vitest-plugin', 'plugin.js'),
    '@storybook/addon-vitest': addonVitestPath,
    '@storybook/addon-vitest/internal/global-setup': join(addonVitestPath, 'vitest-plugin', 'global-setup.js')
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
