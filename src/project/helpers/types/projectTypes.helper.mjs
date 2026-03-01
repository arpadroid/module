/**
 * @typedef {import("../../../types.js").BuildConfigType} BuildConfigType
 * @typedef {import("../../project.mjs").default} Project
 * @typedef {import('../../../rollup/builds/rollup-builds.mjs').CompileTypesType} CompileTypesType
 * @typedef {import('rollup').RollupOptions} RollupOptions
 */
import { spawn, spawnSync } from 'child_process';
import fs, { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { glob } from 'glob';
import { NO_TYPES } from './../build/projectBuild.helper.mjs';
import { log } from '@arpadroid/logger';
import { prepareArgs, findLocation } from '@arpadroid/tools-node';
const CWD = process.cwd();

///////////////////////////
// #region Accessors
///////////////////////////

/**
 * Returns true if the project has Typescript build files, false otherwise.
 * @param {Project} project
 * @returns {boolean}
 */
export function hasBuildFiles(project) {
    return (
        existsSync(`${project.path}/.tmp/.types/index.d.ts`) ||
        existsSync(`${project.path}/.tmp/.types/index.d.mts`)
    );
}

/**
 * Determines if the types build should be skipped for the project.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<boolean>}
 */
export async function shouldSkipTypesBuild(project, config) {
    const parent = await project.getParentProject();
    return Boolean(
        NO_TYPES || config.buildTypes !== true || parent?.buildConfig?.skipTypesBuild?.includes(project.name)
    );
}

/**
 * Returns the path to the TypeScript binary for the given project.
 * @param {Project} project
 * @returns {string}
 */
export function getTsBinary(project) {
    const binaryTail = join('node_modules', '.bin', 'tsc');
    const binary = findLocation([
        join(project.getModulePath() || CWD, binaryTail),
        join(project.path || CWD, binaryTail)
    ]);
    if (!binary) throw new Error(`TypeScript compiler not found for project ${project.name}`);
    return binary;
}

/**
 * Determines if a quick build can be performed based on the provided configuration.
 * A quick build requires turbo mode AND existing build artifacts that are newer than all source files.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {boolean}
 */
export function canRunQuickBuild(project, config) {
    return config.turbo === true;
}

// #endregion

//////////////////////////////////////
// #region TS Commands
///////////////////////////////////////

/**
 * Handles the types build's child process for the project.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @param {{ verbose?: boolean; args?: Record<string, unknown>; turbo?: boolean }} opt
 * @returns {Promise<boolean>}
 */
export function handleBuildProcess(project, config, opt) {
    const { watch } = config;
    const { verbose = false, args = {}, turbo = false } = opt;

    return new Promise((resolve, reject) => {
        const child = spawn(getTsBinary(project), prepareArgs(args), {
            cwd: project.path || CWD,
            stdio: watch ? 'ignore' : 'inherit'
        });
        child.on('error', err => {
            log.error(`Failed to spawn tsc for @arpadroid/${project.name}:`, err);
            reject(err);
        });
        if (watch || turbo) {
            child.unref();
            resolve(true);
            return;
        }
        child.on('close', code => {
            if (code === 0) {
                resolve(true);
                verbose && log.success(`Types built successfully for @arpadroid/${project.name}!`);
            } else {
                log.error(`Failed to build types for @arpadroid/${project.name}. Exit code: ${code}`);
                reject(new Error(`tsc exited with code ${code} for @arpadroid/${project.name}`));
            }
        });
    });
}

/**
 * Compiles the types for the project.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @param {{ force?: boolean, verbose?: boolean }} opt
 * @returns {Promise<boolean>}
 */
export async function runTsBuild(project, config, opt = {}) {
    const { watch } = config;
    const { force = true, verbose = false } = opt;
    return handleBuildProcess(project, config, {
        ...opt,
        args: {
            build: true,
            force,
            watch,
            preserveWatchOutput: watch
        }
    });
}

/**
 * Compiles the types for the project.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @param {{ verbose?: boolean }} opt
 * @returns {Promise<boolean>}
 */
export async function runFastTsBuild(project, config, opt = {}) {
    const { watch, skipLibCheck } = config || {};
    return handleBuildProcess(project, config, {
        ...opt,
        turbo: true,
        args: {
            declaration: true,
            emitDeclarationOnly: true,
            preserveWatchOutput: watch,
            project: 'tsconfig.json',
            skipLibCheck: true,
            watch
        }
    });
}

/**
 * Checks the types for the project.
 * @param {Project} project
 * @param {{ verbose?: boolean }} opt
 * @returns {Promise<boolean>}
 */
export async function checkTypes(project, opt = {}) {
    const { verbose = true } = opt;
    verbose && log.task(project.name, 'Checking types...\n');
    await project.getBuildConfig();
    const args = {
        project: project.path + '/tsconfig.json',
        noEmit: true
    };
    const binary = getTsBinary(project);
    const result = spawnSync(binary, prepareArgs(args), {
        cwd: project.path,
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        log.error(`Type check failed for ${project.name}`, result);
    } else if (verbose) {
        log.success(`Types check passed with no errors for @arpadroid/${project.name}, well done! :) \n`);
    }
    return Promise.resolve(result.status === 0);
}

// #endregion TS Commands

////////////////////////////
// #region Compilation
////////////////////////////

/**
 * Copies all types.d.ts files to the dist/@types directory maintaining the directory structure.
 * @param {Project} project
 * @param {CompileTypesType} config
 * @returns {Promise<unknown[]>}
 */
export async function compileTypes(project, config = {}) {
    // Create the dist/@types directory if it does not exist.
    if (!existsSync(`${project.path}/dist/@types`)) {
        await mkdirSync(`${project.path}/dist/@types`, { recursive: true });
    }

    // Get the input and destination directories.
    let { inputDir = project.path + '/src/', destination = project.path + '/.tmp/.types/' } = config;
    const { filePattern = '**/*.types.d.ts', prependFiles = [`${inputDir}types.d.ts`] } = config;
    !inputDir.endsWith('/') && (inputDir += '/');
    !destination.endsWith('/') && (destination += '/');

    // Get the files to copy.
    const files = [
        ...Array.from(prependFiles),
        ...(glob.sync(inputDir + filePattern, { cwd: project.path }) || [])
    ];
    // Copy the files to the destination directory.
    /** @type {Promise<unknown>[]} */
    const promises = [];
    files.forEach(async file => {
        const dest = file.replace(inputDir, destination);
        const dir = dirname(dest);
        !existsSync(dir) && mkdirSync(dir, { recursive: true });
        promises.push(fs.promises.copyFile(`${file}`, dest));
    });

    return Promise.all(promises);
}

/**
 * Compiles the types for the project.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @param {{ force?: boolean, verbose?: boolean }} opt
 * @returns {Promise<boolean>}
 */
export async function compileTypeDeclarations(project, config, opt = {}) {
    const { force = !hasBuildFiles(project) } = opt;
    /**
     * @todo - Disabling fast build for now until things are stable.
     */
    // if (!force && canRunQuickBuild(project, config)) {
    //     return runFastTsBuild(project, config, opt);
    // }
    return runTsBuild(project, config, { force });
}

// #endregion Compilation

/////////////////////
// #region Build
/////////////////////

/**
 * Creates an types.d.ts file in the dist directory and writes the content to it.
 * @param {Project} project
 * @returns {Promise<boolean>}
 */
export async function addEntryTypesFile(project) {
    const base = `${project.path}/.tmp/.types`;
    const indexFile = existsSync(`${base}/index.d.ts`) ? `${base}/index.d.ts` : `${base}/index.d.mts`;
    const indexContents = readFileSync(indexFile, 'utf8');
    const typesContents = readFileSync(`${project.path}/.tmp/.types/types.d.ts`, 'utf8');
    const file = `${project.path}/.tmp/.types/types.compiled.d.ts`;
    const contents = `${indexContents}\n\n${typesContents}`;
    writeFileSync(file, contents);
    return true;
}

/**
 * Copies the directory .types to dist/@types.
 * @param {Project} project
 */
export async function distTypes(project) {
    const typesPath = join(project.path + '/dist', '@types');
    if (!existsSync(typesPath)) {
        mkdirSync(typesPath, { recursive: true });
    }
    cpSync(`${project.path}/.tmp/.types`, typesPath, { recursive: true });
}

/**
 * Builds the project types.
 * @param {Project} project
 * @param {BuildConfigType} config
 * @returns {Promise<boolean>}
 */
export async function buildTypes(project, config) {
    if (await shouldSkipTypesBuild(project, config)) {
        return Promise.resolve(true);
    }

    if (!config.isDependency) {
        log.task(project.name, 'Building types.');
    }

    const run = async () => {
        await compileTypes(project);
        await compileTypeDeclarations(project, config);
        await addEntryTypesFile(project);
        await distTypes(project);
        return true;
    };

    const parent = await project.getParentProject();
    if (parent?.buildConfig?.deferTypesBuild?.includes(project.name)) {
        parent.deferredOperations.push({
            operation: run,
            name: project.name,
            description: 'Build types'
        });
        return Promise.resolve(true);
    }

    await run();

    return Promise.resolve(true);
}

// #endregion Build
