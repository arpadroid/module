/**
 * @typedef {import('./main.types.js').ResolutionTypes} ResolutionTypes
 * @typedef {import('./main.types.js').ResolutionType} ResolutionType
 */
import { join, resolve } from 'path';

export const moduleRoot = resolve(import.meta.dirname, '../../..');
export const addonVitestPath = join(moduleRoot, 'node_modules', '@storybook', 'addon-vitest', 'dist');
export const modulesRoot = join(moduleRoot, 'node_modules');
export const storybookPath = join(modulesRoot, 'storybook', 'dist');
export const vitestPath = join(modulesRoot, 'vitest', 'dist');

/** @type {ResolutionTypes} */
const resolutions = {
    'storybook/internal/preview/runtime': join(storybookPath, 'preview', 'runtime.js'),
    'storybook/internal/csf': join(storybookPath, 'csf', 'index.js'),
    '@storybook/addon-vitest/internal/test-utils': join(addonVitestPath, 'vitest-plugin', 'test-utils.js'),
    '@storybook/addon-vitest/internal/global-setup': join(
        addonVitestPath,
        'vitest-plugin',
        'global-setup.js'
    ),
    '@storybook/addon-vitest/internal/setup-file': join(addonVitestPath, 'vitest-plugin', 'setup-file.js'),
    '@storybook/web-components-vite': join(modulesRoot, '@storybook', 'web-components-vite'),
    '@storybook/builder-vite': join(modulesRoot, '@storybook', 'builder-vite'),
    'vitest/internal/browser': join(vitestPath, 'browser.js'),
    'vitest/runners': join(vitestPath, 'runners.js'),
    chai: join(modulesRoot, 'chai'),
    'expect-type': join(modulesRoot, 'expect-type'),
    'magic-string': join(modulesRoot, 'magic-string'),
    storybook: {
        find: /^storybook$/,
        replacement: join(modulesRoot, 'storybook', 'dist')
    },
    vitest: {
        find: /^vitest$/,
        replacement: join(modulesRoot, 'vitest', 'dist')
    },
    '@vitest/browser/client': join(modulesRoot, '@vitest', 'browser', 'dist', 'client.js'),
    'storybook/test': join(storybookPath, 'test', 'index.js')
    // '@storybook/addon-vitest/internal/plugin': join(addonVitestPath, 'vitest-plugin', 'plugin.js'),
    // '@storybook/addon-vitest': addonVitestPath,
    // '/node_modules/@arpadroid/module/.storybook/preview.js': 'virtual:preview-config',
    // 'vitest/config': join(vitestPath, 'config.js'),
    // 'vitest/node': join(vitestPath, 'node.js'),
    // 'vitest/browser': join(modulesRoot, '@vitest', 'browser', 'dist', 'index.js'),
    // '@storybook/addon-docs': join(modulesRoot, '@storybook', 'addon-docs', 'dist'),
    // '@storybook/addon-docs/blocks': join(modulesRoot, '@storybook', 'addon-docs', 'dist', 'blocks.js'),
    // '@storybook/addon-links': join(modulesRoot, '@storybook', 'addon-links', 'dist', 'index.js'),
    // '@storybook/addon-a11y': join(modulesRoot, '@storybook', 'addon-a11y', 'dist', 'index.js'),
    // storybook: join(modulesRoot, 'storybook', 'dist', 'index.js'),
};

/**
 * Gets the alias object for a given module name.
 * @param {keyof typeof resolutions} moduleName - The name of the module to get the alias for.
 * @returns {ResolutionType | any} The alias object with 'find' and 'replacement' properties.
 */
export function getAlias(moduleName) {
    /** @type {string | ResolutionType} */
    const entry = resolutions[moduleName];
    if (typeof entry === 'object' && entry.find) {
        return /** @type {ResolutionType} */ (entry);
    }
    if (typeof entry === 'string') {
        return { find: moduleName, replacement: entry };
    }
    return { find: moduleName, replacement: join(modulesRoot, moduleName, 'dist', 'index.js') };
}
/**
 * Converts the resolutions object into an array of alias objects for Vite/Vitest.
 * @returns {ResolutionType[]} The array of alias objects.
 */
export function getAliasResolutions() {
    return Object.keys(resolutions).map(key => {
        return getAlias(key);
    });
}

export default resolutions;
