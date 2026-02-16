/* eslint-disable security/detect-non-literal-fs-filename */
/**
 * @typedef {import('../build/projectBuilder.types.js').DependencyProjectPointerType} DependencyProjectPointerType
 * @typedef {import('@custom-elements-manifest/analyzer').Config} AnalyzerConfig
 * @typedef {import('../../../rollup/builds/rollup-builds.types.js').BuildConfigType} BuildConfigType
 * @typedef {{
 * create?: (options: { modules: any[], plugins: any[], context: { dev: boolean } }) => Promise<Manifest>,
 * ts?: typeof import('typescript')
 * }} AnalyzerType
 * @typedef {import('../../project.mjs').default} Project
 * @typedef {Record<string, any>} Manifest
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { glob } from 'glob';
import { log } from '@arpadroid/logger';
import { getAllDependencies } from '../build/projectBuild.helper.mjs';
import { safeReadJson } from '@arpadroid/tools-node';
import { mergeObjects } from '@arpadroid/tools-iso';
import { exec, execSync } from 'child_process';
const CWD = process.cwd();

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
 * @returns {Manifest[]}
 */
export function loadFiles(files) {
    return files.map(frag => safeReadJson(frag)).filter(Boolean);
}

/**
 * Load and parse all manifest fragments for the project and its dependencies (if not slim). Logs errors for individual files but continues loading others.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<Manifest[]>}
 */
export async function loadFragments(project, config) {
    const files = await getFragments(project, config);
    return loadFiles(files);
}

/**
 * Returns the analyzer script path for the project.
 * @param {Project} project
 * @returns {string | undefined}
 */
export function getAnalyzerBinary(project) {
    const basePath = project?.getModulePath() || CWD;
    return join(basePath, 'node_modules', '@custom-elements-manifest', 'analyzer', 'src', 'create.js');
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
 * Returns the command to run the analyzer script for the project. Logs an error and returns undefined if the analyzer script cannot be found.
 * @param {Project} project
 * @param {Partial<AnalyzerConfig>} args
 * @returns {string | undefined}
 */
export function getAnalyzerScript(project, args = {}) {
    const bin = getAnalyzerBinary(project);
    if (!bin) return undefined;
    let script = `node ${bin}`;
    const defaultConfig = {
        config: getAnalyzerConfigFile(project) || undefined
    };
    const config = mergeObjects(defaultConfig, args);
    for (const [key, value] of Object.entries(config)) {
        if (value) {
            script += ` --${key}="${value}"`;
        }
    }
    return script;
}

/**
 * Runs the analyzer script for the project and returns the generated manifest. Logs errors if the analyzer cannot be run.
 * @param {Project} project
 * @param {Partial<AnalyzerConfig>} args
 * @returns {Promise<Manifest | undefined>}
 */
export async function runAnalyzer(project, args) {
    const script = getAnalyzerScript(project, args);
    if (!script) return undefined;
    console.log('script', script);
    return exec(script, { cwd: project.path || CWD }, (error, stdout, stderr) => {
        if (error) {
            log.error(`Error running analyzer for project ${project.name}:`, error);
            return undefined;
        }
        if (stderr) {
            log.error(`Analyzer stderr for project ${project.name}:`, stderr);
            // continue even if there is stderr output, as some analyzers may output warnings to stderr
        }
        console.log('stdout', stdout);
        return stdout;
        // try {
        //     const manifest = JSON.parse(stdout);
        //     return manifest;
        // } catch (parseError) {
        //     log.error(`Error parsing analyzer output for project ${project.name}:`, parseError);
        //     return undefined;
        // }
    });
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
    // const fragments = await loadFragments(project, config);
    // console.log('fragments', fragments);

    const analyzerManifest = await runAnalyzer(project, {});
    console.log('analyzerManifest', analyzerManifest);
    // const buttonDcl = analyzerManifest.modules.find(
    //     (/** @type {Record<string, unknown>} */ mod) => mod.path === 'src/components/button/button.js'
    // );
    // const btnExports = buttonDcl.exports[0];
    // console.log('analyzerManifest', buttonDcl);
    // console.error('fragments', fragments[0].modules[0].declarations);
    // console.log('analyzerManifest', analyzerManifest);
    // if (analyzer) {
    //     analyzerManifest = ;
    // } else {
    //     log.task(project.name, 'Custom elements analyzer not available — using fragments only.');
    // }

    // const merged = mergeManifests(analyzerManifest, files);
    // writeManifest(project, merged);
    return true;
}

/**
 * Write the merged manifest to `dist/custom-elements.json`.
 * @param {Project} project
 * @param {Manifest} manifest
 */
export function writeManifest(project, manifest) {
    const outDir = join(project.path || '', 'dist');
    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }
    const outFile = join(outDir, 'custom-elements.json');
    writeFileSync(outFile, JSON.stringify(manifest, null, 2));
}

export default buildCustomElementsManifest;

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
 * Returns the parsed manifest content for a project, if the manifest file exists and can be read. Logs errors and returns undefined if the file cannot be read or parsed.
 * @param {Project | undefined} project
 * @returns {Manifest | undefined}
 */
export function getManifestContent(project) {
    const manifestFile = getManifestFile(project);
    if (!manifestFile) return undefined;
    return safeReadJson(manifestFile);
}
