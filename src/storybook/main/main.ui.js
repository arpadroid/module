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
import { addAliasResolutions } from './mainResolutions.js';
import { getConfigStoryPatterns } from '../../project/helpers/projectStorybook.helper.js';
import { getProject } from '../../project/projectStore.mjs';

const mainConfig = await getMainConfig();
const moduleRoot = path.resolve(import.meta.dirname, '../../..');
const addonVitestPath = path.resolve(moduleRoot, 'node_modules/@storybook/addon-vitest');

const staticDirs = getStaticDirs();
const project = await getProject();
await project?.getBuildConfig();
/** @type {StorybookConfig} */
const defaultConfig = {
    stories: getConfigStoryPatterns(project),
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
     * @param {ViteConfig} config
     * @returns {Promise<ViteConfig>}
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
