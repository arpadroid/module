/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('vite').UserConfig} ViteConfig
 * @typedef {import('storybook/internal/types').Options} Options
 */

import Project from '../../project/project.mjs';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { getProject } from '../../project/projectStore.mjs';
import { getStoryPatterns } from '../../project/helpers/projectStorybook.helper.js';
import { log } from '@arpadroid/logger';
import { getAliasResolutions } from './mainResolutions.js';

const cwd = process.cwd();
const html = String.raw;
const modulesRoot = resolve(import.meta.dirname, '../../..', 'node_modules');
const addonsRoot = resolve(modulesRoot, '@storybook');

/**
 * Gets the static directories for Storybook.
 * @returns {string[]} Array of static directory paths.
 */
export function getStaticDirs() {
    const dirs = [
        join(cwd, 'dist'),
        join(cwd, 'src'),
        join(cwd, 'assets'),
        join(cwd, 'storybook', 'decorators')
    ];
    return dirs.filter(dir => existsSync(dir));
}

/**
 * Asynchronously loads the main Storybook configuration if it exists.
 * @returns {Promise<Record<string, unknown>>} The main configuration object.
 */
export async function getMainConfig() {
    const path = resolve(cwd, 'src', 'storybook', 'main.js');
    if (existsSync(path)) {
        let module = await import(`file://${path}`);
        module = module.default || module || {};
        if (module instanceof Promise) {
            module = await module;
        }
        return module;
    }
    return {};
}

/**
 * Asynchronously loads the preview Storybook configuration if it exists.
 * @returns {string | undefined} The preview configuration object.
 */
export function getPreviewConfigFile() {
    const path = resolve(cwd, 'src', 'storybook', 'preview.js');
    if (existsSync(path)) {
        return path;
    }
}

/**
 * Creates a Vite plugin that provides a virtual module for the preview configuration.
 * @param {string | undefined} previewPath - Path to the preview.js file.
 * @returns {import('vite').Plugin} Vite plugin.
 */
export function previewConfigPlugin(previewPath) {
    const virtualModuleId = 'virtual:preview-config';
    const resolvedVirtualModuleId = '\0' + virtualModuleId;

    let moduleCode = 'export default {};';
    if (typeof previewPath === 'string' && previewPath) {
        const template = readFileSync(
            resolve(import.meta.dirname, '../preview/preview-template.js'),
            'utf-8'
        );
        moduleCode = template.replaceAll('__PREVIEW_PATH__', previewPath);
    }

    return {
        name: 'preview-config',
        resolveId(id) {
            if (id === virtualModuleId) return resolvedVirtualModuleId;
        },
        load: id => {
            if (id === resolvedVirtualModuleId) return moduleCode;
        }
    };
}

/**
 * Converts absolute story patterns to relative patterns based on the project path.
 * @param {Project | undefined} project
 * @returns {string[]} An array of relative glob patterns for Storybook stories.
 */
export function getStories(project = getProject()) {
    if (!project) {
        log.error('getConfigStoryPatterns: Project not found', project);
        return [];
    }
    const path = project.path || '';
    const patterns = getStoryPatterns(project);
    const rv = patterns.map(pattern => {
        if (pattern.startsWith(path)) {
            pattern = pattern.replace(path + '/', '');
        }
        if (pattern.startsWith('./')) {
            pattern = pattern.substring(2);
        }
        if (pattern.startsWith(cwd)) {
            pattern = pattern.replace(cwd + '/', '');
        }
        if (pattern.startsWith('/')) {
            pattern = pattern.substring(1);
        }
        return '../' + pattern;
    });
    if (!rv.length) {
        return ['../src/**/*.stories.{ts,tsx,js,jsx}'];
    }
    return rv;
}

/**
 * Gets the list of Storybook addons to be used in the configuration.
 * @returns {string[]} An array of paths to Storybook addons.
 */
export function getAddons() {
    return ['addon-vitest', 'addon-docs', 'addon-links', 'addon-a11y', 'addon-themes'].map(addon =>
        join(addonsRoot, addon)
    );
}

/**
 * Sets aliases to Vite configuration for Storybook. This is used to ensure that Storybook and Vitest resolve the same modules, which is important for features like the Storybook Vitest addon.
 * @param {ViteConfig} config
 *@param {import('./mainResolutions.js').ResolutionType[]} aliases
 */
export function injectAliases(config = {}, aliases = getAliasResolutions()) {
    const { resolve = {} } = config;
    let { alias = [] } = resolve;
    config.resolve = resolve || {};
    if (!Array.isArray(alias)) {
        alias = [];
    }
    config.resolve.alias = [...alias, ...aliases];
}

/**
 * Renders the content for the HTML head.
 * @param {string | undefined} head
 * @param {Options} options
 * @param {Project} [project]
 * @returns {Promise<string>}
 */
export async function previewHead(head = '', options, project = getProject()) {
    if (!(project instanceof Project)) {
        throw new Error('Invalid project instance passed to renderArpadroidHead');
    }
    await project.promise;
    const config = await project.getBuildConfig();
    const fn = config?.storybook?.previewHead;
    const content =
        (typeof fn === 'function' && fn(head, options, project)) ||
        html`<link rel="preload" href="/i18n/en.json" as="fetch" type="application/json" crossorigin />
            <link rel="stylesheet" href="/material-symbols/outlined.css" onerror="this.remove()" />
            <link rel="stylesheet" href="/themes/default/default.bundled.final.css" onerror="this.remove()" />
            <link
                id="mobile-styles"
                rel="stylesheet"
                href="/themes/mobile/mobile.bundled.final.css"
                disabled
                onerror="this.remove()"
            />
            <link
                id="dark-styles"
                rel="stylesheet"
                href="/themes/dark/dark.bundled.final.css"
                disabled
                onerror="this.remove()"
            />
            <script src="/arpadroid-polyfills.js" onerror="this.remove()"></script>
            <script type="module" src="/arpadroid-${project.name}.js" onerror="this.remove()"></script> `;
    return `${head || ''}${content}`;
}

/**
 * Renders the content for the HTML body.
 * @param {string | undefined} body
 * @param {Options} options
 * @param {Project} [project]
 * @returns {Promise<string>}
 */
export async function previewBody(body = '', options, project = getProject()) {
    if (!(project instanceof Project)) {
        throw new Error('Invalid project instance passed to renderArpadroidHead');
    }
    await project.promise;
    const config = await project.getBuildConfig();
    const fn = config?.storybook?.previewBody;
    const extraBody = (typeof fn === 'function' && fn(body, options, project)) || html`${body || ''}`;
    return `${body || ''}${extraBody}`;
}
