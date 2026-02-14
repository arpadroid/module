/**
 * Storybook main configuration for Vite-based Web Components projects.
 * This configuration is shared across all @arpadroid projects.
 * @typedef {import('vite').UserConfig} ViteConfig
 * @typedef {import('@storybook/web-components-vite').StorybookConfig} StorybookConfig
 *
 */
import path from 'node:path';
import viteConfig from '../viteFinal.js';
import { mergeObjects } from '@arpadroid/tools-iso';
import { renderStorybookBody, renderStorybookHead } from '../templates/mainTemplates.js';
import { getMainConfig, getPreviewConfigFile, getStaticDirs, previewConfigPlugin } from './main.helper.js';
import { getAliasResolutions } from './mainResolutions.js';
import { getConfigStoryPatterns } from '../../project/helpers/projectStorybook.helper.js';
import { getProject } from '../../project/projectStore.mjs';

const modulesRoot = path.resolve(import.meta.dirname, '../../..', 'node_modules');
const addonsRoot = path.resolve(modulesRoot, '@storybook');

/**
 * Storybook addons are defined here!
 */
const addons = [
    'addon-vitest' // Storybook Vitest addon for running tests in Storybook
    // 'addon-docs',
    // 'addon-links',
    // 'addon-a11y'
];

const staticDirs = getStaticDirs();
const project = await getProject();
await project?.getBuildConfig();
/** @type {StorybookConfig} */
const defaultConfig = {
    stories: getConfigStoryPatterns(project),
    staticDirs,
    addons: addons.map(addon => path.join(addonsRoot, addon)),
    framework: {
        name: '@storybook/web-components-vite',
        options: {}
    },
    docs: {},
    previewBody: renderStorybookBody,
    previewHead: renderStorybookHead,
    /**
     * Configures Vite for Storybook.
     * @param {ViteConfig} config
     * @returns {Promise<ViteConfig>}
     */
    viteFinal: async (config = {}) => {
        const cfg = mergeObjects(config, viteConfig, { mergeArrays: true });
        const previewConfig = getPreviewConfigFile();
        cfg.plugins.push(previewConfigPlugin(previewConfig));
        // Merge alias resolutions into cfg.resolve.alias (always as array)
        const aliasResolutions = getAliasResolutions();
        cfg.resolve.alias = [...(cfg.resolve.alias || []), ...aliasResolutions];
        return cfg;
    }
};

const config = mergeObjects(defaultConfig, await getMainConfig(), {
    mergeArrays: true
});

export default config;
