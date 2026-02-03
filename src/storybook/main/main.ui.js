/**
 * Storybook main configuration for Vite-based Web Components projects.
 * This configuration is shared across all @arpadroid projects.
 */
import viteConfig from '../viteFinal.js';
import { mergeObjects } from '@arpadroid/tools-iso';
import { renderStorybookBody, renderStorybookHead } from '../templates/mainTemplates.js';
import { getMainConfig, getPreviewConfigFile, getStaticDirs, previewConfigPlugin } from './main.helper.js';
const cwd = process.cwd();
const mainConfig = await getMainConfig();
const defaultConfig = {
    stories: [cwd + '/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    staticDirs: getStaticDirs(),
    // addons: ['@storybook/addon-a11y', '@storybook/addon-docs', '@storybook/addon-links'],
    framework: {
        name: '@storybook/web-components-vite',
        options: {}
    },
    docs: {},
    previewBody: renderStorybookBody,
    previewHead: renderStorybookHead,
    /**
     * Configures Vite for Storybook.
     * @param {import('vite').UserConfig} config - The Vite configuration.
     * @returns {Promise<import('vite').UserConfig>} The updated Vite configuration.
     */
    viteFinal: async (config = {}) => {
        const cfg = mergeObjects(config, viteConfig, { mergeArrays: true });
        // cfg.define['import.meta.env.STORYBOOK_PROJECT_CONFIG'] = JSON.stringify(fileConfig || {});
        const previewConfig = getPreviewConfigFile();
        cfg.plugins.push(previewConfigPlugin(previewConfig));
        return cfg;
    }
};

const config = mergeObjects(defaultConfig, mainConfig, {
    mergeArrays: true
});

export default config;
