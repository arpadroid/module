/**
 * @typedef {import('@custom-elements-manifest/analyzer').Config} AnalyzerConfig
 * @typedef {import('./plugins/arpadroid/arpadroid-cem-plugin.js').Plugin} Plugin
 */
import ArpadroidCemPlugin from './plugins/arpadroid/arpadroid-cem-plugin.js';
import { join } from 'path';

/** @type {AnalyzerConfig} */
export default {
    globs: [join('src', '**', '*.js')],
    exclude: ['**/*.stories.*', '**/*.test.*', '**/storybook/**'],
    outdir: 'dist',
    dev: false,
    watch: false,
    dependencies: false,
    packagejson: false, // Output CEM path to `package.json`, defaults to true
    catalyst: false,
    fast: false,
    stencil: false,
    plugins: [/** @type {any} */ (ArpadroidCemPlugin())],
    /**
     * Resolution options when using `dependencies: true`
     * For detailed information about each option, please refer to the [oxc-resolver documentation](https://github.com/oxc-project/oxc-resolver?tab=readme-ov-file#options).
     */
    resolutionOptions: {
        extensions: ['.js', '.ts'],
        mainFields: ['module', 'main'],
        conditionNames: ['import', 'require']
    }
};
