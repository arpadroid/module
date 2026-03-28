/**
 * Storybook main configuration for Vite-based Web Components projects.
 * This configuration is shared across all @arpadroid projects.
 */
import type { UserConfig as ViteConfig } from 'vite';
import type { StorybookConfig } from '@storybook/web-components-vite';
import viteConfig from '../viteFinal.js';
import { mergeObjects } from '@arpadroid/tools-iso';
import { previewConfigPlugin, customElementsPlugin, getStories, getAddons, injectAliases, previewBody } from './main.helper.js';
import { getMainConfig, getPreviewConfigFile, getStaticDirs, previewHead } from './main.helper.js';
import { refreshPlugin } from '../vite/plugins/refreshPlugin.js';

const defaultConfig: StorybookConfig = {
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
    /** Configures Vite for Storybook. */
    viteFinal: async (config: ViteConfig = {}): Promise<ViteConfig> => {
        const cfg = mergeObjects(config, viteConfig, { mergeArrays: true });
        const configFile = getPreviewConfigFile();
        console.log('configFile', configFile);
        cfg.plugins.push(previewConfigPlugin(configFile));
        cfg.plugins.push(customElementsPlugin());
        cfg.plugins.push(refreshPlugin());
        injectAliases(cfg);
        return cfg;
    }
};

const config = mergeObjects(defaultConfig, await getMainConfig(), {
    mergeArrays: true
});

export default config;
