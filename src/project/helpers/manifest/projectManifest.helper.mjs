/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('@custom-elements-manifest/analyzer').Config} AnalyzerConfig
 * @typedef {import('../../../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('../../project.mjs').default} Project
 * @typedef {import('./projectManifest.helper.types.js').CemSchemaType} CemSchemaType
 */
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { glob } from 'glob';
import { log } from '@arpadroid/logger';
import { getAllDependencies } from '../build/projectBuild.helper.mjs';
import { prepareArgs, safeReadJson } from '@arpadroid/tools-node';
import { mergeObjects } from '@arpadroid/tools-iso';
import { spawnSync } from 'child_process';
const CWD = process.cwd();

/////////////////////
// #region Analyzer
/////////////////////

/**
 * Returns the analyzer script path for the project.
 * @param {Project} project
 * @returns {string | undefined}
 */
export function getAnalyzerBinary(project) {
    const basePath = project?.getModulePath() || CWD;
    return join(basePath, 'node_modules', '@custom-elements-manifest', 'analyzer', 'cem.js');
}

/**
 * Returns the analyzer config file path for the project.
 * @param {Project} project
 * @returns {string | undefined}
 */
export function getAnalyzerConfigFile(project) {
    const basePath = project?.getModulePath() || CWD;
    const configPath = join(basePath, 'src', 'cem', 'custom-elements-manifest.config.js');
    if (!existsSync(configPath)) {
        log.warning(
            `No analyzer config file found for project ${project?.name} at expected path ${configPath}`
        );
        return undefined;
    }
    return configPath;
}

/**
 * Runs the analyzer CLI for the project. The CLI is expected to write `dist/custom-elements.json`.
 * @param {Project} project
 * @param {Partial<AnalyzerConfig>} opt
 * @returns {Promise<boolean|undefined>}
 */
export async function runAnalyzer(project, opt = {}) {
    const bin = getAnalyzerBinary(project);
    if (!bin) return undefined;

    const defaultArgs = {
        config: getAnalyzerConfigFile(project)
    };
    const args = prepareArgs(mergeObjects(defaultArgs, opt));
    const result = spawnSync('node', [bin, 'analyze', ...args], {
        cwd: project.path || CWD,
        stdio: 'inherit',
        maxBuffer: 10 * 1024 * 1024
    });

    if (result.error) {
        log.error(`Analyzer failed for project ${project.name}:`, result.error);
        return undefined;
    }

    if (typeof result.status === 'number' && result.status !== 0) {
        log.error(`Analyzer exited with code ${result.status} for project ${project.name}`);
        return undefined;
    }

    return true;
}

// #endregion Analyzer

/////////////////////
// #region Manifest
/////////////////////

/**
 * Determines if the manifest should be built for the given project and config.
 * @param {Project | undefined} project
 * @returns {boolean}
 */
export function canBuildManifest(project) {
    const { buildManifest, buildType } = project?.buildConfig || {};
    return Boolean(buildType === 'uiComponent' && buildManifest);
}

/**
 * Returns the manifest file for a project, if it exists. Logs an error and returns undefined if the file cannot be read or parsed.
 * @param {Project | undefined} project
 * @returns {string | undefined}
 */
export function getManifestFile(project) {
    const manifestPath = resolve(join(project?.path || CWD, 'dist', 'custom-elements.json'));
    if (!existsSync(manifestPath)) {
        log.warning(`No manifest file found for project ${project?.name} at expected path ${manifestPath}`);
        return undefined;
    }
    return manifestPath;
}

/**
 * Build and persist the Custom Elements Manifest for the given project.
 * @param {Project} project
 * @param {BuildConfigType} [_config]
 * @returns {Promise<boolean>}
 */
export async function buildCustomElementsManifest(project, _config = project.buildConfig || {}) {
    if (!canBuildManifest(project)) return true;
    log.task(project.name, 'Building Custom Elements manifest (CEM).');
    await runAnalyzer(project);

    // Verify the analyzer created the manifest file; fail the build if not.
    const manifestFile = getManifestFile(project);
    if (!manifestFile) {
        throw new Error(`Custom Elements Manifest not produced for project ${project.name}`);
    }

    return true;
}

/**
 * Returns the parsed manifest content for a project, if the manifest file exists and can be read. Logs errors and returns undefined if the file cannot be read or parsed.
 * @param {Project | undefined} project
 * @returns {CemSchemaType | undefined}
 */
export function getManifestContent(project) {
    const manifestFile = getManifestFile(project);
    if (!manifestFile) return undefined;
    return safeReadJson(manifestFile);
}

// #endregion Manifest

///////////////////////////
// #region Fragments
///////////////////////////

/**
 * Returns all manifest files in the project.
 * @param {Project | undefined} project
 * @returns {string[]}
 */
export function getProjectFragments(project) {
    const pattern = join(project?.path || '', 'src', '**', '*.manifest.json');
    return glob.sync(pattern, { nodir: true }) || [];
}

/**
 * Returns all manifest files.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<string[]>}
 */
export async function getFragments(project, config) {
    const { slim } = config;
    /**
     * If slim is true (the project is being built as a dependency of another module),
     * only load the project's own manifest files (no dependencies).
     */
    const files = getProjectFragments(project);
    if (slim) return files;
    const deps = (await getAllDependencies(project)) || [];
    for (const dep of deps) {
        if (!canBuildManifest(dep.project)) continue;
        files.push(...getProjectFragments(dep.project));
    }
    return files;
}

/**
 * Load and parse fragment files. Logs errors for individual files but continues loading others.
 * @param {string[]} files
 * @returns {CemSchemaType[]}
 */
export function loadFiles(files) {
    return files.map(frag => safeReadJson(frag)).filter(Boolean);
}

/**
 * Load and parse all manifest fragments for the project and its dependencies (if not slim). Logs errors for individual files but continues loading others.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<CemSchemaType[]>}
 */
export async function loadFragments(project, config) {
    const files = await getFragments(project, config);
    return loadFiles(files);
}

// #endregion
