/**
 * @typedef {import('webpack').Configuration} WebpackConfig
 */
import { basename } from 'path';
import fs from 'fs';
import Project from '../project/project.mjs';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

const html = String.raw;
const cwd = process.cwd();
const modulesRoot = cwd + '/node_modules/@arpadroid/module/node_modules';
const sbRoot = modulesRoot + '/@storybook';
const projectName = basename(cwd);

/** @type {any} */
let projectConfig;
/** @type {Promise<any> | undefined} */
let projectConfigPromise;

function getProjectConfig() {
    if (projectConfig) {
        return projectConfig;
    }
    if (!projectConfigPromise) {
        projectConfigPromise = Project._getFileConfig().then(config => {
            projectConfig = config;
            return config;
        });
    }
    return projectConfigPromise;
}

/**
 * Renders the content for the HTML head.
 * @param {string} _head
 * @returns {string}
 */
function renderPreviewHead(_head) {
    const config = projectConfig || {};
    const fn = config?.storybook?.previewHead;
    const head =
        (typeof fn === 'function' && fn()) ||
        html`
            <link rel="preload" href="/i18n/en.json" as="fetch" type="application/json" />
            <link rel="stylesheet" href="/material-symbols/outlined.css" />
            <link rel="stylesheet" href="/themes/default/default.bundled.final.css" />
            <link
                id="mobile-styles"
                rel="stylesheet"
                href="/themes/mobile/mobile.bundled.final.css"
                disabled
            />
            <link id="dark-styles" rel="stylesheet" href="/themes/dark/dark.bundled.final.css" disabled />
            <script src="/arpadroid-polyfills.js"></script>
            <script type="module" src="/arpadroid-${projectName}.js"></script>
        `;

    return `${_head}${head}`;
}

/**
 * Renders the content for the HTML body.
 * @param {string} _body
 * @returns {string}
 */
function renderPreviewBody(_body) {
    const config = projectConfig || {};
    const fn = config?.storybook?.previewBody;
    const body = (typeof fn === 'function' && fn()) || html`${_body}`;

    return `${_body}${body}`;
}

const staticDirs = [cwd + '/dist', cwd + '/src'];
fs.existsSync(cwd + '/assets') && staticDirs.push(cwd + '/assets');
fs.existsSync(cwd + '/storybook/decorators') && staticDirs.push(cwd + '/storybook/decorators');
const config = {
    stories: [cwd + '/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    staticDirs,
    addons: [
        `${sbRoot}/addon-a11y`,
        `${sbRoot}/addon-actions`,
        `${sbRoot}/addon-backgrounds`,
        `${sbRoot}/addon-controls`,
        `${sbRoot}/addon-docs`,
        `${sbRoot}/addon-interactions`,
        `${sbRoot}/addon-links`,
        `${sbRoot}/addon-measure`,
        `${sbRoot}/addon-outline`,
        `${sbRoot}/addon-toolbars`,
        `${sbRoot}/addon-viewport`,
        `${sbRoot}/addon-webpack5-compiler-swc`
    ],
    framework: {
        name: `${sbRoot}/web-components-webpack5`,
        options: {}
    },
    docs: { autodocs: 'tag' },
    previewBody: renderPreviewBody,
    previewHead: renderPreviewHead,
    /**
     * Configures the webpack.
     * @param {WebpackConfig} config - The webpack configuration.
     * @returns {Promise<WebpackConfig>} The updated webpack configuration.
     */
    webpackFinal: async config => {
        config.watchOptions = config.watchOptions || {};
        config.module = config.module || {};
        config.plugins = config.plugins || [];
        config.module.rules = config.module.rules || [];
        config.resolve = config.resolve || {};
        config.resolve.fallback = config.resolve.fallback || {};
        config.watchOptions.aggregateTimeout = 500;

        config.watchOptions.ignored = [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**/@types/**',
            '**/*.d.ts',
            '**/.tmp/**'
        ];
        config.module.rules = config.module.rules.filter((/** @type {any} */ rule) => {
            const isCSSRule = rule?.test?.toString().includes('css');
            return isCSSRule ? false : true;
        });
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            'rollup-plugin-copy': modulesRoot + '/rollup-plugin-copy/dist/index.module.js',
            '@storybook/test': sbRoot + '/test',
            '@storybook/addon-actions': sbRoot + '/addon-actions',
            'storybook/internal': modulesRoot + '/storybook/core',
            fsevents: false,
            'node:url': 'url',
            'node:fs': 'fs',
            'node:path': 'path'
        };

        config.resolve.fallback = {
            ...config.resolve.fallback,
            string_decoder: require.resolve('string_decoder/'),
            url: require.resolve('url/'),
            async_hooks: false,
            worker_threads: false,
            module: false,
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
            buffer: require.resolve('buffer/'),
            child_process: false
        };
        config.plugins.unshift(new NodePolyfillPlugin());
        return config;
    },
    /**
     * Configures the environment variables.
     * @param {Record<string, unknown>} config - The environment variables.
     * @returns {Record<string, unknown>} The updated environment variables.
     */
    env: config => ({
        ...config,
        PROJECT_CONFIG: JSON.stringify(projectConfig || {})
    })
};

// Initialize project config asynchronously
getProjectConfig();

export default config;
