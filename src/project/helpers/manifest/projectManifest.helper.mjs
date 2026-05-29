/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('@custom-elements-manifest/analyzer').Config} AnalyzerConfig
 * @typedef {import('../../../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('../../project.mjs').default} Project
 * @typedef {import('./projectManifest.helper.types.js').CemSchemaType} CemSchemaType
 * @typedef {import('./projectManifest.helper.types.js').ManifestModeType} ManifestModeType
 * @typedef {import('./projectManifest.helper.types.js').BuildManifestConfigType} BuildManifestConfigType
 */
import { cpSync, existsSync, statSync, writeFileSync } from 'fs';
import { join, resolve, sep } from 'path';
import { log, logStyle } from '@arpadroid/logger';
import { prepareArgs, safeReadJson, argv } from '@arpadroid/tools-node';
import { mergeObjects } from '@arpadroid/tools-iso';
import { spawnSync } from 'child_process';
import { formatBytes } from '@arpadroid/tools-iso';
import { getProject } from '../../projectStore.mjs';
import { getAllDependencies } from '../build/projectBuild.helper.mjs';

export const USE_TYPES_CHECKER = argv.typesChecker;
const FORCE_MANIFEST = argv.forceManifest || false;
const CWD = process.cwd();
/** CEM analyzer output directory. Must match the `outdir` field in custom-elements-manifest.config.js. */
export const CEM_OUTDIR = '';

/////////////////////
// #region Manifest
/////////////////////

/**
 * Return output filename for the selected manifest mode.
 * @param {ManifestModeType} mode
 * @returns {string}
 */
function getManifestOutputFilename(mode = 'standard') {
    return mode !== 'standard' ? `custom-elements.${mode}.json` : 'custom-elements.json';
}

/**
 * Determines whether to use the types checker based on command line arguments and project configuration.
 * @param {Project | undefined} project
 * @returns {Promise<boolean>}
 */
export async function shouldUseTypesChecker(project = getProject()) {
    if (!project) return false;
    const { manifest } = (await project?.getConfig()) || {};
    if (typeof USE_TYPES_CHECKER === 'undefined') {
        return manifest?.useTypesChecker || false;
    }

    return USE_TYPES_CHECKER;
}

/**
 * Returns the manifest file for a project, if it exists. Logs an error and returns undefined if the file cannot be read or parsed.
 * @param {Project | undefined} project
 * @returns {string | undefined}
 */
export function getManifestFile(project) {
    return resolve(join(project?.path || CWD, CEM_OUTDIR, 'custom-elements.json'));
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

/**
 * Minify a JSON manifest file in place.
 * @param {string} filePath
 * @returns {boolean}
 */
function minifyManifestFile(filePath) {
    const json = safeReadJson(filePath);
    if (!json) return false;
    writeFileSync(filePath, JSON.stringify(json));
    return true;
}

// #endregion Manifest

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
 * @param {ManifestModeType} mode
 * @param {boolean} debug
 * @returns {Promise<boolean|undefined>}
 */
export async function runAnalyzer(project, opt = {}, mode = 'standard', debug = false) {
    const bin = getAnalyzerBinary(project);
    if (!bin) return undefined;

    const defaultArgs = {
        config: getAnalyzerConfigFile(project)
    };
    const args = prepareArgs(mergeObjects(defaultArgs, opt));
    const result = spawnSync('node', [bin, 'analyze', ...args], {
        cwd: project.path || CWD,
        stdio: 'inherit',
        env: {
            ...process.env,
            ARPADROID_CEM_MODE: mode,
            ARPADROID_CEM_DEBUG_MODULES: debug ? '1' : '0'
        },
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

/**
 * Determines if the manifest should be built for the given project and config.
 * @param {Project | undefined} project
 * @param {BuildConfigType} config
 * @returns {Promise<boolean>}
 */
export async function canBuildManifest(project, config = project?.buildConfig || {}) {
    const { buildType, buildManifest, slim } = config;
    if (buildType !== 'uiComponent' || !buildManifest) {
        return false;
    }
    if (slim) {
        const { manifest: parentManifest } = (await project?.getParentConfig()) || {};
        const { buildDeps = false, skipIfExists } = parentManifest || {};
        if (buildDeps === false || (!FORCE_MANIFEST && skipIfExists && getManifestFile(project))) {
            return false;
        }
    }
    return true;
}

/**
 * Logs the result of the manifest build.
 * @param {number} startTime
 * @param {string} file
 * @param {Project} project
 * @param {string} mode
 */
function logBuildEnd(startTime, file, project, mode = 'standard') {
    const seconds = String((Date.now() - startTime) / 1000);
    const fileSize = existsSync(file) ? `${formatBytes(statSync(file).size)}` : 'unknown size';
    const fileName = file.replace(CWD + sep, '');
    log.task(project.name, `Created manifest at ${logStyle.heading(fileName)}`);
    log.task(
        project.name,
        `[💾 ${fileSize}] [mode=${mode}]  [⏱️  ${logStyle.highlight(seconds)}s] 🧩 ▰▰▰▰ 🗸 `
    );
}
/**
 * Bundle the manifest files of the project and its dependencies into a single file. This is used for the "slim" manifest mode, where each project builds a manifest with only its own components, and then they are bundled together to create a complete manifest for the entire project graph.
 * @param {Project} project
 * @returns {Promise<void>}
 */
export async function bundleManifests(project) {
    const deps = await getAllDependencies(project);
    const manifestFiles = deps.map(dep => getManifestFile(dep.project)).filter(Boolean);
    console.log('manifestFiles', manifestFiles);
}

/**
 * Build and persist the Custom Elements Manifest for the given project.
 * @param {Project} project
 * @param {BuildManifestConfigType} [options]
 * @param {BuildConfigType} config
 * @returns {Promise<boolean>}
 */
export async function buildCustomElementsManifest(project, options = {}, config = project.buildConfig || {}) {
    const { slim, manifest } = config;
    const {
        bypassCheck = false,
        mode = config.manifest?.mode || 'standard',
        minify = false,
        debug = false
    } = options;

    const { skipIfExists = false, buildDeps } = manifest || {};
    if (bypassCheck !== true && !(await canBuildManifest(project))) {
        return true;
    }

    const manifestFile = getManifestFile(project) || '';

    if (!FORCE_MANIFEST && skipIfExists && existsSync(manifestFile)) {
        log.task(
            project.name,
            'Skipping CEM build as "skipIfExists" option is enabled and file exists. 🧩 ▰▰▰▰ 🗸'
        );
        return true;
    }
    if (!slim) {
        log.task(project.name, `Building Custom Elements Manifest (CEM) [mode=${mode}] 🧩 ▰▱▱▱`);
    }
    const startTime = Date.now();
    await runAnalyzer(project, undefined, mode, debug);
    if (!manifestFile) {
        throw new Error(`Custom Elements Manifest not produced for project ${project.name}`);
    } else {
        if (!slim && buildDeps) {
            await bundleManifests(project);
        }
        minify && minifyManifestFile(manifestFile);
        const basePath = project.path || CWD;
        const outputFilename = getManifestOutputFilename(mode);
        cpSync(manifestFile, join(basePath, 'dist', outputFilename));
    }
    logBuildEnd(startTime, manifestFile, project, mode);
    return true;
}

// #endregion Analyzer

// #endregion
