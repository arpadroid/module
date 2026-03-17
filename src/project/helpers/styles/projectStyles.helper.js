/**
 * @typedef {import('../../../rollup/builds/rollup-builds.mjs').BuildConfigType} BuildConfigType
 * @typedef {import('../build/projectBuilder.types.js').DependencyPointerType} DependencyPointerType
 * @typedef {import('@arpadroid/style-bun').ThemesBundlerConfigType} ThemesBundlerConfigType
 * @typedef {import('@arpadroid/style-bun').StyleUpdateCallbackPayloadType} StyleUpdateCallbackPayloadType
 * @typedef {import('@arpadroid/style-bun').ThemeBundler} ThemeBundler
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

import { mergeObjects } from '@arpadroid/tools-iso';
import { ThemesBundler } from '@arpadroid/style-bun';
import { log } from '@arpadroid/logger';

import PROJECT_STORE, { getProject } from '../../projectStore.mjs';
import Project from '../../project.mjs';
import { getAllDependencies } from '../build/projectBuild.helper.mjs';

//////////////////////////
// #region Get
//////////////////////////

/**
 * Returns the themes path for the project.
 * @param {Project} project
 * @returns {string}
 */
export function getThemesPath(project) {
    return project.buildConfig?.themesPath || join(project.path || '', 'src', 'themes');
}

/**
 * Returns the list of themes for the project.
 * @param {Project} project
 * @returns {string[]}
 */
export function getThemes(project) {
    const path = getThemesPath(project);
    return existsSync(path) ? readdirSync(path) : [];
}

/**
 * Checks if the project has styles to build.
 * @param {Project} project
 * @returns {boolean}
 */
export function hasStyles(project) {
    const { buildStyles } = project.buildConfig || {};
    if (buildStyles === false) {
        return false;
    }
    const themes = getThemes(project);
    return themes.length > 0;
}

/**
 * Retrieves the style patterns from the build config.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {string[]}
 */
export function getStylePatterns(project, config) {
    let stylePatterns = config.style_patterns || [];
    if (typeof stylePatterns === 'string') {
        stylePatterns = stylePatterns.split(',').map(pattern => pattern.trim());
    }
    stylePatterns = stylePatterns.map(pattern => `${project.path}/src/${pattern}`);
    return stylePatterns;
}

/**
 * Retrieves the style packages for the project and its dependencies.
 * @param {Project} project
 * @param {string} themeName - The theme to retrieve the styles for.
 * @returns {Promise<string[]>}
 */
export async function getThemeStyleSheets(project, themeName = 'default') {
    /** @type {string[]} */
    const rv = [];
    const deps = await getAllDependencies(project);
    deps.push({
        name: project.name,
        path: project.path || process.cwd(),
        project
    });
    deps.forEach(({ project: dep, path }) => {
        if (!dep || !hasStyles(dep)) return;
        if (!getThemes(dep).includes(themeName)) return;
        const file = join(path, 'src', 'themes', themeName, `${themeName}.bundled.css`);
        if (!existsSync(file)) return;
        rv.push(file);
    });
    return rv;
}

// #endregion Get

//////////////////////////
// #region  Bundling
//////////////////////////

/**
 * Deploys the given theme files to the project dist folder.
 * @param {Project} project
 * @param {string} themeName - The name of the theme to deploy.
 * @param {{ destination?: string; fileName?: string }} options - Additional options for deployment.
 * @returns {Promise<void>}
 */
export async function deployTheme(project, themeName, options = {}) {
    const {
        destination = join(project.path || '', 'dist', 'themes', themeName),
        fileName = `${themeName}.bundled.final.css`
    } = options;

    let css = '';
    const styles = await getThemeStyleSheets(project, themeName);
    styles.forEach(file => existsSync(file) && (css += readFileSync(file, 'utf8')));
    if (css) {
        if (!existsSync(destination)) {
            await mkdirSync(destination, { recursive: true });
        }
        await writeFileSync(join(destination, fileName), css);
        log.task(project.name, `Deployed theme ${chalk.magentaBright(themeName)} to dist folder.`);
    }
    return Promise.resolve();
}

/**
 * Callback function for when a theme is bundled. Can be used to trigger a full page reload in dev mode.
 * @param {Project} dep
 * @param {StyleUpdateCallbackPayloadType} payload - The payload containing information about the theme update.
 * @param {ThemeBundler} theme - The theme that was updated.
 * @return {Promise<boolean>} Returns true if the theme was successfully deployed, false otherwise.
 */
export async function onThemeBundled(dep, payload, theme) {
    const buildConfig = dep.buildConfig || {};
    const { parent } = buildConfig;
    const { themeName = theme.themeName } = payload;
    const project = (parent && getProject(parent)) || dep;
    themeName && (await deployTheme(project, themeName));
    return true;
}

/**
 * Creates a ThemesBundler instance for a project.
 * @param {Project} project
 * @param {BuildConfigType} buildConfig
 * @param {ThemesBundlerConfigType} bundlerConfig
 * @returns {Promise<ThemesBundler>}
 */
export async function createBundlerInstance(project, buildConfig, bundlerConfig = {}) {
    const { minify } = buildConfig;
    const patterns = [
        join(project.path || '', 'src', 'components', '**', '*'),
        ...getStylePatterns(project, buildConfig)
    ];
    /** @type {ThemesBundlerConfigType} */
    const defaultConfig = {
        exportPath: join(project.path || '', 'dist', 'themes'),
        minify,
        patterns,
        themesPath: getThemesPath(project),
        watchCallback: (payload, theme) => onThemeBundled(project, payload, theme)
    };
    const conf = mergeObjects(defaultConfig, bundlerConfig);
    const bundler = new ThemesBundler(conf);
    return bundler;
}

/**
 * Creates a ThemesBundler instance and bundles the project styles initializing as per config.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @param {ThemesBundlerConfigType} [bundlerConfig]
 * @returns {Promise<any | boolean>}
 */
export async function bundleStyles(project, config, bundlerConfig = {}) {
    const { buildStyles, slim } = config;
    if (!buildStyles || !hasStyles(project)) return true;
    !slim && log.task(project.name, 'Bundling CSS.');
    const bundler = await createBundlerInstance(project, config, bundlerConfig);
    await bundler.initialize();
    return bundler;
}

/**
 * Copies style dependencies from the UI package into the dist folder.
 * @param {Project} project
 */
export async function copyUIAssets(project) {
    const uiProject = PROJECT_STORE.ui;
    const uiPath = uiProject?.path;
    if (!uiPath) return;
    // Copy fonts
    const fontsPath = join('themes', 'default', 'fonts');
    const fontSrc = join(uiPath, 'src', fontsPath);
    const fontDest = join(project.path || '', 'dist', fontsPath);
    cpSync(fontSrc, fontDest, { recursive: true });
    // Copy material symbols
    const matSrc = join(uiPath, 'node_modules', 'material-symbols');
    const matDest = join(project.path || '', 'dist', 'material-symbols');
    cpSync(matSrc, matDest, { recursive: true });
}

/**
 * Compiles the project styles including other arpadroid module dependency styles, copies UI assets if present.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<boolean>}
 */
export async function compileStyles(project, config) {
    const { buildStyles, slim } = config;
    if (!hasStyles(project) || !buildStyles || slim) {
        return Promise.resolve(true);
    }
    log.task(project.name, 'Compiling dependency styles.');
    for (const theme of getThemes(project)) {
        await deployTheme(project, theme);
    }
    const deps = project.dependencyProjects;
    const hasUI = deps?.find(dep => dep.name === 'ui');
    hasUI && (await copyUIAssets(project));

    return Promise.resolve(true);
}
