/**
 * @typedef {import("../../types.js").BuildConfigType} BuildConfigType
 * @typedef {import("../project.mjs").default} Project
 * @typedef {import('../../rollup/builds/rollup-builds.mjs').CompileTypesType} CompileTypesType
 * @typedef {import('rollup').RollupOptions} RollupOptions
 */
/* eslint-disable security/detect-non-literal-fs-filename */
import { spawn } from 'child_process';
import fs, { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { glob } from 'glob';
import { NO_TYPES } from './projectBuild.helper.mjs';

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
 * @returns {Promise<boolean>}
 */
export async function compileTypeDeclarations(project, config) {
    const { watch } = config;
    const watchString = watch ? '--watch --preserveWatchOutput &' : '';
    // Try to find TypeScript binary in local node_modules
    const localTsc = `${project.path}/node_modules/.bin/tsc`;
    const moduleTsc = `${project.getModulePath()}/node_modules/.bin/tsc`;
    const globalTsc = 'tsc';

    let tscPath = globalTsc;
    if (existsSync(localTsc)) {
        tscPath = localTsc;
    } else if (existsSync(moduleTsc)) {
        tscPath = moduleTsc;
    }

    const cmd = `cd ${project.path} && ${tscPath} -b --declaration --emitDeclarationOnly ${watchString}`;
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, {
            shell: true,
            stdio: watch ? 'ignore' : 'inherit' // ← Suppress output only in watch mode
        });
        child.on('close', code => {
            code === 0
                ? resolve(true)
                : reject(new Error(`Failed to compile types for ${project.name}. Exit code: ${code}`));
        });
    });
}

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
 * @param {RollupOptions[]} rollupConfig
 * @param {BuildConfigType} config
 * @returns {Promise<boolean>}
 */
export async function buildTypes(project, rollupConfig, config) {
    if (config?.buildTypes !== true || NO_TYPES) {
        return Promise.resolve(false);
    }
    await compileTypes(project);
    await compileTypeDeclarations(project, config);
    await addEntryTypesFile(project);
    await distTypes(project);
    return true;
}
