/**
 * Storybook main configuration for Vite-based Web Components projects.
 * This configuration is shared across all @arpadroid projects.
 * @typedef {import('vite').UserConfig} ViteConfig
 * @typedef {import('@storybook/web-components-vite').StorybookConfig} StorybookConfig
 */
import viteConfig from '../viteFinal.js';
import { mergeObjects } from '@arpadroid/tools-iso';
import { previewConfigPlugin, getStories, getAddons, injectAliases, previewBody } from './main.helper.js';
import { getMainConfig, getPreviewConfigFile, getStaticDirs, previewHead } from './main.helper.js';

/** @type {StorybookConfig} */
const defaultConfig = {
    addons: getAddons(),
    docs: {},
    framework: {
        name: '@storybook/web-components-vite',
        options: {}
    },
    previewBody,
    previewHead,
    staticDirs: getStaticDirs(),
    stories: getStories(),
    /**
     * Configures Vite for Storybook.
     * @param {ViteConfig} config
     * @returns {Promise<ViteConfig>}
     */
    viteFinal: async (config = {}) => {
        const cfg = mergeObjects(config, viteConfig, { mergeArrays: true });
        cfg.plugins.push(previewConfigPlugin(getPreviewConfigFile()));
        injectAliases(cfg);
        return cfg;
    }
};

const config = mergeObjects(defaultConfig, await getMainConfig(), {
    mergeArrays: true
});

export default config;
