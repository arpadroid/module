/**
 * @typedef {import('@custom-elements-manifest/analyzer').Plugin} Plugin
 */

/**
 * Arpadroid CEM plugin integration.
 * @returns {Plugin}
 */
import { handleAttributes, handleTagName } from './arpadroid-cem.utils.js';

/**
 * A plugin for the Custom Elements Manifest analyzer to enhance documentation for Arpadroid components.
 * This plugin processes custom elements to extract additional metadata and improve the generated manifest.
 * @returns {Plugin}
 */
export function ArpadroidCemPlugin() {
    return {
        name: 'arpadroid-cem-plugin', // @ts-ignore
        /**
         * Called when the plugin is initialized. You can perform setup tasks here.
         * @param {import('@custom-elements-manifest/analyzer').InitializeParams} _params
         */
        initialize(_params) {
            // console.log('arpadroid-cem-plugin initialize', {
            //     packagePath: params?.customElementsManifest?.packagePath
            // });
        },
        /**
         * Called during the analyze phase for each module. You can inspect and modify the moduleDoc here.
         * @param {import('@custom-elements-manifest/analyzer').AnalyzePhaseParams} payload
         */
        analyzePhase(payload) {
            const parsed = handleTagName(payload);
            handleAttributes(payload, parsed);
        }
    };
}

export default ArpadroidCemPlugin;
