/* eslint-disable security/detect-non-literal-fs-filename */
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
const cwd = process.cwd();

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
        const module = await import(`file://${path}`);
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
        const template = readFileSync(resolve(import.meta.dirname, '../preview/preview-template.js'), 'utf-8');
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
