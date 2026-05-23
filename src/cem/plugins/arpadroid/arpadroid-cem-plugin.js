/**
 * Arpadroid CEM plugin integration.
 * @returns {Plugin}
 */
/**
 * @typedef {import('@custom-elements-manifest/analyzer').Plugin} Plugin
 * @typedef {import('@custom-elements-manifest/analyzer').InitializeParams} InitializeParams
 * @typedef {import('@custom-elements-manifest/analyzer').AnalyzePhaseParams} AnalyzePhaseParams
 * @typedef {import('@custom-elements-manifest/analyzer').PackageLinkPhaseParams} PackageLinkPhaseParams
 */

import { attributesFromModule, handleAttributes, mergeInheritedAttributes } from './utils/cem-utils.js';
import { shouldUseTypesChecker } from '../../../project/helpers/manifest/projectManifest.helper.mjs';
import { handleTagName } from './utils/cem-mutation.utils.js';

const useTypesChecker = await shouldUseTypesChecker();

/**
 * Walk a declaration's inheritance chain and merge ConfigType attributes from each ancestor
 * that was registered in `classFileMap` during `analyzePhase`.
 * @param {any} decl
 * @param {Map<string, any>} declMap
 * @param {Map<string, string>} classFileMap
 * @param {any} ts
 * @param {boolean} useChecker
 */
function propagateAncestorAttributes(decl, declMap, classFileMap, ts, useChecker) {
    if (!decl.superclass) return;
    const visited = new Set();
    let ancestorRef = decl.superclass;
    while (ancestorRef?.name && !visited.has(ancestorRef.name)) {
        visited.add(ancestorRef.name);
        const filePath = classFileMap.get(ancestorRef.name);
        if (filePath) {
            const attrs = attributesFromModule(ts, filePath, ancestorRef.name, useChecker);
            mergeInheritedAttributes(decl, attrs, ancestorRef.name);
        }
        ancestorRef = declMap.get(ancestorRef.name)?.superclass;
    }
}

/**
 * A plugin for the Custom Elements Manifest analyzer to enhance documentation for Arpadroid components.
 * This plugin processes custom elements to extract additional metadata and improve the generated manifest.
 * @returns {Plugin}
 */
export function ArpadroidCemPlugin() {
    /**
     * Maps class name to its absolute source file path, captured during `analyzePhase`.
     * Used by `packageLinkPhase` to locate sibling types files for ancestor classes.
     * @type {Map<string, string>}
     */
    const classFileMap = new Map();
    /** @type {any} TypeScript compiler API, captured from `initialize`. */
    let _ts;

    return {
        name: 'arpadroid-cem-plugin',
        /**
         * Captures the TypeScript compiler API for use in `packageLinkPhase`.
         * @param {InitializeParams} params
         */
        async initialize(params) {
            _ts = params.ts;
        },
        /**
         * Called during the analyze phase for each module. Records the absolute file path for
         * each discovered custom element class so `packageLinkPhase` can locate its types file.
         * @param {AnalyzePhaseParams} payload
         */
        analyzePhase(payload) {
            const parsed = handleTagName(payload);
            if (parsed) {
                const filePath = payload.node?.getSourceFile()?.fileName;
                if (parsed.className && filePath) classFileMap.set(parsed.className, filePath);
                handleAttributes(payload, parsed, useTypesChecker, filePath);
            }
        },
        /**
         * Called once after all modules have been analyzed and linked.
         * Walks each declaration's inheritance chain and propagates ConfigType attributes from
         * ancestor classes defined in other source files, populating `inheritedFrom` so that
         * Storybook and other consumers can categorize inherited vs own attributes correctly.
         * @param {PackageLinkPhaseParams} payload
         */
        packageLinkPhase({ customElementsManifest }) {
            if (!_ts) return;
            const modules = /** @type {any[]} */ (customElementsManifest.modules || []);

            /** @type {Map<string, any>} */
            const declMap = new Map();
            for (const mod of modules) {
                for (const decl of /** @type {any[]} */ (mod.declarations || [])) {
                    if (decl.name) declMap.set(decl.name, decl);
                }
            }

            for (const mod of modules) {
                for (const decl of /** @type {any[]} */ (mod.declarations || [])) {
                    propagateAncestorAttributes(decl, declMap, classFileMap, _ts, useTypesChecker);
                }
            }
        }
    };
}

export default ArpadroidCemPlugin;
