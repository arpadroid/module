/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('@custom-elements-manifest/analyzer').Config} AnalyzerConfig
 * @typedef {import('../../../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {import('../../project.mjs').default} Project
 * @typedef {import('./projectManifest.helper.types.js').CemSchemaType} CemSchemaType
 * @typedef {import('./projectManifest.helper.types.js').ManifestModeType} ManifestModeType
 * @typedef {import('./projectManifest.helper.types.js').BuildManifestConfigType} BuildManifestConfigType
 * @typedef {import('custom-elements-manifest/schema').Module} ManifestModuleType
 * @typedef {import('rollup').Plugin} RollupPlugin
 * @typedef {import('custom-elements-manifest/schema').Package} CustomElementsManifest
 */
import { cpSync, existsSync, writeFileSync } from 'fs';
import { join, resolve, sep, dirname } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

import { log, fileSizeLog } from '@arpadroid/logger';
import { prepareArgs, safeReadJson, argv } from '@arpadroid/tools-node';
import { mergeObjects } from '@arpadroid/tools-iso';

import { getProject } from '../../projectStore.mjs';
import { getAllDependencies } from '../build/projectBuild.helper.mjs';

const CWD = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** CEM analyzer output directory. Must match the `outdir` field in custom-elements-manifest.config.js. */
export const CEM_OUTDIR = '';
export const USE_TYPES_CHECKER = argv.typesChecker;
const FORCE_MANIFEST = argv.forceManifest || false;

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
 * Returns the manifest path for a project, whether it exists or not.
 * @param {Project | undefined} project
 * @returns {string | undefined}
 */
export function getManifestPath(project) {
    return resolve(join(project?.path || CWD, CEM_OUTDIR, 'custom-elements.json'));
}

/**
 * Returns the manifest file for a project if it exists.
 * @param {Project | undefined} project
 * @returns {string | undefined}
 */
export function getManifestFile(project) {
    const manifestPath = getManifestPath(project) || '';
    return existsSync(manifestPath) ? manifestPath : undefined;
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
 * @param {boolean} strict
 * @returns {Promise<boolean>}
 */
export async function canBuildManifest(project, config = project?.buildConfig || {}, strict = true) {
    const { buildType, buildManifest, slim } = config;
    if (buildType !== 'uiComponent' || !buildManifest) {
        return false;
    }
    if (slim) {
        const { manifest: parentManifest } = (await project?.getParentConfig()) || {};
        const { buildDeps = false, skipIfExists } = parentManifest || {};
        if (buildDeps === false || (!FORCE_MANIFEST && strict && skipIfExists)) {
            return false;
        }
    }
    return true;
}

/**
 * Retrieves and parses the manifest payloads for the project and its dependencies.
 * Each dependency's manifest modules will have their paths adjusted to be relative to the project root.
 * Logs errors for individual files but continues loading others.
 * @param {Project} project
 * @returns {Promise<CustomElementsManifest[]>}
 */
export async function getManifestPayloads(project) {
    const deps = await getAllDependencies(project);
    deps.push({ project, name: project.name, path: project.path || '' });
    /** @type {CustomElementsManifest[]} */
    const payloads = [];
    deps.forEach(dep => {
        const file = getManifestFile(dep.project) || '';
        if (!file) return;
        const payload = /** @type {CustomElementsManifest | undefined} */ (safeReadJson(file));
        if (!payload) return;
        if (dep.name !== project.name) {
            /** @type {ManifestModuleType[]} */
            const modules = payload.modules || [];
            modules.forEach(module => {
                module.path = dep.path.replace(CWD + sep, '') + sep + module.path;
            });
        }
        payloads.push(payload);
    });
    return payloads;
}

/**
 * Load and parse fragment files. Logs errors for individual files but continues loading others.
 * @param {Project} project
 * @returns {Promise<CustomElementsManifest>}
 */
export async function mergeManifests(project) {
    /** @type {ManifestModuleType[]} */
    const modules = [];
    const payloads = await getManifestPayloads(project);
    payloads.forEach(payload => {
        payload?.modules && modules.push(...payload.modules);
    });
    const basePayload = payloads.pop();
    const payload = {
        ...basePayload,
        schemaVersion: basePayload?.schemaVersion || 'experimental',
        modules
    };
    return payload;
}

/**
 * Bundle the manifest files of the project and its dependencies into a single file. This is used for the "slim" manifest mode, where each project builds a manifest with only its own components, and then they are bundled together to create a complete manifest for the entire project graph.
 * @param {Project} project
 * @param {string} manifestFile
 * @returns {Promise<{ payload: CustomElementsManifest }>}
 */
export async function bundleManifests(project, manifestFile) {
    /** @type {CustomElementsManifest} */
    const payload = await mergeManifests(project);
    if (existsSync(manifestFile)) {
        writeFileSync(manifestFile, JSON.stringify(payload, null, 2));
    }
    return { payload };
}

/**
 * Logs the manifest build process for the project, including start and completion messages with file size information.
 * @param {Project} project
 * @param {ManifestModeType} mode
 * @param {string} manifestFile
 * @returns {void | undefined | ((value: unknown) => void)}
 */
export function logManifestBuild(project, mode, manifestFile) {
    return log.task(project.name, 'Building Custom Elements Manifest', {
        icon: '🧩',
        doneMessage: () => {
            return `Manifest done. ${fileSizeLog(manifestFile)} [mode=${mode}]`;
        }
    });
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

    const manifestFile = getManifestPath(project) || '';

    if (bypassCheck !== true && !FORCE_MANIFEST && skipIfExists && existsSync(manifestFile)) {
        const msg = `Manifest exists, skipping build. ${fileSizeLog(manifestFile)}`;
        log.task(project.name, msg, { icon: '🧩' });
        return true;
    }

    const logResolve = logManifestBuild(project, mode, manifestFile);
    await runAnalyzer(project, undefined, mode, debug);
    if (!existsSync(manifestFile)) {
        log.error(`Custom Elements Manifest not produced for project ${project.name}`);
        return false;
    }
    if (!slim && buildDeps) {
        await bundleManifests(project, manifestFile);
    }
    minify && minifyManifestFile(manifestFile);
    const basePath = project.path || CWD;
    const outputFilename = getManifestOutputFilename(mode);
    cpSync(manifestFile, join(basePath, 'dist', outputFilename));
    logResolve && logResolve?.(true);
    return true;
}

// #endregion Analyzer

//////////////////////////
// #region Watch & Update
//////////////////////////

/**
 * Adds project files to the watcher so that changes to those files trigger a watch rebuild and are visible to the changedFiles tracking in project.mjs. Specifically, it adds all .types.d.ts files in src/ and all .js files in the cem/ directory.
 * @param {Project} project
 * @param {import('rollup').PluginContext} context
 * @returns {Promise<void>}
 */
export async function addProjectFilesToWatcher(project, context) {
    if (!project.path) return;
    const typesPattern = join(project.path, 'src', '**', '*.types.d.ts').replaceAll('\\', '/');
    for (const file of await glob(typesPattern)) {
        context.addWatchFile(file);
    }
    const cemDir = resolve(import.meta.dirname, '../../cem');
    const cemPattern = join(cemDir, '**', '*.js').replaceAll('\\', '/');
    for (const file of await glob(cemPattern)) {
        context.addWatchFile(file);
    }
}

/**
 * Returns a rollup plugin that registers all .types.d.ts files in src/ with rollup's file
 * watcher so that changes to those files trigger a watch rebuild and are visible to the
 * changedFiles tracking in project.mjs.
 * @param {Project} project
 * @returns {RollupPlugin}
 */
export function manifestWatchPlugin(project) {
    return {
        name: 'manifest-watch',
        async buildStart() {
            if (!(await canBuildManifest(project, project.buildConfig || {}, false))) {
                return;
            }
            addProjectFilesToWatcher(project, this);
        }
    };
}

/**
 * Updates the manifest after a watch event triggers.
 * @param {Project} project
 * @param {Set<string>} files
 * @returns {Promise<boolean|undefined>}
 */
export async function updateManifest(project, files) {
    const config = project.buildConfig || {};
    const cemSrcDir = resolve(__dirname, '../cem');
    const hasTypesChange = [...files].some(file => file.endsWith('.types.d.ts'));
    const hasCemChange = [...files].some(file => file.startsWith(cemSrcDir));
    files.clear();
    if (!hasTypesChange && !hasCemChange) return;
    !config.manifest && (config.manifest = {});
    const options = { minify: true, bypassCheck: true };
    await buildCustomElementsManifest(project, options, config).catch(err =>
        log.error('Failed to rebuild manifest:', err)
    );
    const parent = await project.getParentProject();
    if (parent) {
        await buildCustomElementsManifest(parent, options, parent.buildConfig || {}).catch(err =>
            log.error('Failed to rebuild parent manifest:', err)
        );
    }
    return true;
}

// #endregion
