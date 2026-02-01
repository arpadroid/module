/**
 * Storybook main configuration for Vite-based Web Components projects.
 * This configuration is shared across all @arpadroid projects.
 */
import fs from 'fs';
import Project from '../project/project.mjs';
import viteConfig from './viteFinal.js';
import { mergeObjects } from '@arpadroid/tools-iso';
import { renderStorybookBody, renderStorybookHead } from './templates/mainTemplates.js';
const cwd = process.cwd();

const staticDirs = [cwd + '/dist', cwd + '/src'];
fs.existsSync(cwd + '/assets') && staticDirs.push(cwd + '/assets');
fs.existsSync(cwd + '/storybook/decorators') && staticDirs.push(cwd + '/storybook/decorators');

/** @type {import('@storybook/web-components-vite').StorybookConfig} */
const config = {
    stories: [cwd + '/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    staticDirs,
    addons: [
        '@storybook/addon-a11y',
        '@storybook/addon-docs',
        '@storybook/addon-links',
        '@storybook/addon-essentials'
    ],
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
        const fileConfig = await Project._getFileConfig();
        const cfg = mergeObjects(config, viteConfig);
        cfg.define['import.meta.env.STORYBOOK_PROJECT_CONFIG'] = JSON.stringify(fileConfig || {});

        return cfg;
    }
};

// Initialize project config asynchronously

export default config;
