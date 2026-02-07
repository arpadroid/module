/**
 * Storybook main configuration for Vite-based Web Components projects.
 * This configuration is shared across all @arpadroid projects.
 */
import path from 'node:path';
import viteConfig from '../viteFinal.js';
import { mergeObjects } from '@arpadroid/tools-iso';
import { renderStorybookBody, renderStorybookHead } from '../templates/mainTemplates.js';
import { getMainConfig, getPreviewConfigFile, getStaticDirs, previewConfigPlugin } from './main.helper.js';
import { addAliasResolutions } from './mainResolutions.js';

const mainConfig = await getMainConfig();
const moduleRoot = path.resolve(import.meta.dirname, '../../..');
const addonVitestPath = path.resolve(moduleRoot, 'node_modules/@storybook/addon-vitest');

/**@type {import('@storybook/web-components-vite').StorybookConfig['stories']} */
const stories = ['../src/**/*.stories.{ts,tsx,js,jsx}'];
const staticDirs = getStaticDirs();

/** @type {import('@storybook/web-components-vite').StorybookConfig} */
const defaultConfig = {
    stories,
    staticDirs,
    addons: [addonVitestPath],
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
        const previewConfig = getPreviewConfigFile();
        cfg.plugins.push(previewConfigPlugin(previewConfig));
        addAliasResolutions(cfg.resolve.alias);
        return cfg;
    }
};

const config = mergeObjects(defaultConfig, mainConfig, {
    mergeArrays: true
});

export default config;
