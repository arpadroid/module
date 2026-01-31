/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../../rollup/builds/rollup-builds.mjs').BuildConfigType} BuildConfigType
 * @typedef {import('./projectBuilder.types.js').DependencyProjectPointerType} DependencyProjectPointerType
 */

import { ThemesBundler } from '@arpadroid/style-bun';
import { log } from '@arpadroid/logger';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { getAllDependencies, STYLE_SORT } from './projectBuild.helper.mjs';
import Project from '../project.mjs';
import { join } from 'path';
import chalk from 'chalk';
import PROJECT_STORE from '../projectStore.mjs';

//////////////////////////
// #region Styles Helpers
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
 * @returns {Promise<boolean>}
 */
export async function hasStyles(project) {
    const { buildStyles } = project.buildConfig || {};
    if (buildStyles === false) {
        return false;
    }
    return getThemes(project).length > 0;
}

/**
 * Retrieves the style packages for the project and its dependencies.
 * @param {Project} project
 * @returns {Promise<DependencyProjectPointerType[]>}
 */
export async function getStyleDependencies(project) {
    return [
        ...((await getAllDependencies(project, { sort: STYLE_SORT })) || []),
        {
            name: project.name,
            path: project.path || ''
        }
    ];
}

// #endregion

//////////////////////////
// #region Styles Bundling
//////////////////////////

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
 * Bundles the project styles.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<ThemesBundler | boolean>}
 */
export async function bundleStyles(project, config) {
    const { buildStyles, slim, minify } = config;

    if (!buildStyles) {
        return true;
    }
    const style_patterns = getStylePatterns(project, config);
    !slim && log.task(project.name, 'Bundling CSS.');

    const bundler = new ThemesBundler({
        exportPath: join(project.path || '', 'dist', 'themes'),
        minify,
        patterns: [join(project.path || '', 'src', 'components', '**', '*'), ...style_patterns],
        themesPath: getThemesPath(project)
    });
    await bundler.initialize();
    return bundler;
}

/**
 * Retrieves all stylesheets to compile across dependencies.
 * @param {Project} project
 * @returns {Promise<Record<string, string[]>|boolean>}
 */
export async function getStylesheetsToCompile(project) {
    await project.getBuildConfig();
    const _hasStyles = await hasStyles(project);
    if (!_hasStyles) {
        return false;
    }
    /** @type {Record<string, string[]>} */
    const minifiedDeps = {};
    const styleDeps = await getStyleDependencies(project);
    for (const styleDep of styleDeps) {
        const dep =
            PROJECT_STORE[styleDep.name] ||
            new Project(styleDep.name, {
                path: styleDep.path
            });
        await dep.getBuildConfig();
        if (!(await hasStyles(dep))) continue;
        getThemes(dep).forEach(theme => {
            !minifiedDeps[theme] && (minifiedDeps[theme] = []);
            minifiedDeps[theme].push(`${dep.path}/dist/themes/${theme}/${theme}.min.css`);
        });
    }
    return minifiedDeps;
}

/**
 * Deploys the given theme files to the project dist folder.
 * @param {Project} project
 * @param {string} theme - The theme to build.
 * @param {string[]} files - The files to build the theme from.
 * @returns {Promise<void>}
 */
export async function deployTheme(project, theme, files) {
    const themePath = `${project.path}/dist/themes/${theme}`;
    let css = '';
    let bundledCss = '';

    files.forEach(file => {
        const bundledFile = file.replace('.min.css', '.bundled.css');
        let isValid = false;
        if (existsSync(bundledFile)) {
            isValid = true;
            bundledCss += readFileSync(bundledFile, 'utf8');
        }
        if (existsSync(file)) {
            isValid = true;
            css += readFileSync(file, 'utf8');
        }
        if (!isValid) {
            log.error(`Could not bundle file, ${chalk.magentaBright(file)} does not exist`);
        }
    });
    if (css) {
        if (!existsSync(themePath)) {
            await mkdirSync(themePath, { recursive: true });
        }
        await writeFileSync(`${themePath}/${theme}.final.css`, css);
    }
    if (bundledCss && (await existsSync(themePath))) {
        const file = join(themePath, `${theme}.bundled.final.css`);
        await writeFileSync(file, bundledCss);
    }
    return Promise.resolve();
}

/**
 * Copies style dependencies from the UI package if present into the dist folder.
 * @param {Project} project
 */
export async function copyUIStyleAssets(project) {
    const uiProject = PROJECT_STORE.ui;
    const uiPath = uiProject?.path;
    if (!uiPath) return;
    cpSync(`${uiPath}/src/themes/default/fonts`, `${project.path}/dist/themes/default/fonts`, {
        recursive: true
    });
    cpSync(`${uiPath}/node_modules/material-symbols`, `${project.path}/dist/material-symbols`, {
        recursive: true
    });
}

/**
 * Compiles the project styles including other arpadroid module dependency styles.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<boolean>}
 */
export async function compileStyles(project, config) {
    const { buildStyles, slim } = config;
    const _hasStyles = await hasStyles(project);
    if (!_hasStyles || !buildStyles || slim === true) {
        return Promise.resolve(true);
    }
    log.task(project.name, 'Compiling dependency styles.');
    const minifiedDeps = (await getStylesheetsToCompile(project)) ?? [];
    Object.entries(minifiedDeps).forEach(([theme, files]) => deployTheme(project, theme, files));
    const styleDeps = await getStyleDependencies(project);
    if (styleDeps.find(dep => dep.name === 'ui')) {
        await copyUIStyleAssets(project);
    }
    return Promise.resolve(true);
}
