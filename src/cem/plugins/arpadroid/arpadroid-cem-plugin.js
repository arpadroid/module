/**
 * @typedef {import('@custom-elements-manifest/analyzer').Plugin} Plugin
 * @typedef {import('@custom-elements-manifest/analyzer').InitializeParams} InitializeParams
 * @typedef {import('@custom-elements-manifest/analyzer').AnalyzePhaseParams} AnalyzePhaseParams
 * @typedef {import('@custom-elements-manifest/analyzer').PackageLinkPhaseParams} PackageLinkPhaseParams
 * @typedef {import('./utils/cem-utils.types.js').ManifestFilterPolicy} ManifestFilterPolicy
 * @typedef {import('./utils/cem-utils.types.js').ManifestFilterPolicyPresets} ManifestFilterPolicyPresets
 * @typedef {import('../../../project/helpers/manifest/projectManifest.helper.types.js').ManifestModeType} ManifestModeType
 */

import { attributesFromModule, handleAttributes, mergeInheritedAttributes } from './utils/cem-utils.js';
import { shouldUseTypesChecker } from '../../../project/helpers/manifest/projectManifest.helper.mjs';
import { handleTagName } from './utils/cem-mutation.utils.js';
import { buildDeclMapFromModules, filterModulesWithRegistrations } from './utils/cem-plugin.helpers.js';
import { logManifestModuleDiagnostics, toManifestModulePath } from './utils/cem-plugin.helpers.js';
import { filterManifestStructuralMetadata, filterClassMembers } from './utils/cem-prune.utils.js';
import { isPropagationCandidate, pruneManifestModules } from './utils/cem-prune.utils.js';
import { setMemberFilterPolicy, setStructuralFilterPolicy } from './utils/cem-prune.utils.js';

/**
 * Central manifest filter policy presets.
 * Toggle values here to quickly adjust filtering behavior per mode.
 * @type {ManifestFilterPolicyPresets}
 */
const MANIFEST_FILTER_POLICY = {
    light: {
        omitUnregisteredModules: true,
        omitInheritedMembers: true,
        omitPrivateMembers: true,
        omitModuleKind: true,
        omitDeclarationCustomElement: true,
        omitSuperclassModule: true,
        omitInheritedFromModule: true,
        omitExportDeclarationModule: true,
        pruneForStorybook: true,
        omitDescriptions: true,
        omitTypeSummary: true,
        omitOptional: true,
        omitTypeDetail: true,
        omitExportDeclaration: true,
        omitExports: true,
        omitMemberParameters: true,
        omitUnderscoreMethods: true,
        omitUnderscoreProperties: true
    },
    standard: {
        omitInheritedMembers: true
    },
    heavy: {},
    storybook: {
        omitUnregisteredModules: true,
        omitInheritedMembers: true,
        omitPrivateMembers: true,
        omitModuleKind: true,
        omitDeclarationCustomElement: true,
        omitSuperclassModule: true,
        omitInheritedFromModule: true,
        omitExportDeclarationModule: true,
        pruneForStorybook: true
    }
};

/**
 * Resolve active manifest filter policy from mode.
 * @param {keyof ManifestFilterPolicyPresets} mode
 * @returns {ManifestFilterPolicy}
 */
function getManifestFilterPolicy(mode) {
    return MANIFEST_FILTER_POLICY[mode] || MANIFEST_FILTER_POLICY.standard;
}

const useTypesChecker = await shouldUseTypesChecker();
const manifestMode = /** @type {ManifestModeType} */ (
    String(process.env.ARPADROID_CEM_MODE || 'standard').toLowerCase()
);

const activeFilterPolicy = getManifestFilterPolicy(manifestMode);

setMemberFilterPolicy(activeFilterPolicy);
setStructuralFilterPolicy(activeFilterPolicy);

const shouldLogManifestModules = ['1', 'true', 'yes'].includes(
    String(process.env.ARPADROID_CEM_DEBUG_MODULES || '').toLowerCase()
);

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
    /** @type {Set<string>} */
    const registeredModulePaths = new Set();
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
                if (filePath) registeredModulePaths.add(toManifestModulePath(filePath));
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
            const declMap = buildDeclMapFromModules(modules);

            for (const mod of modules) {
                for (const decl of /** @type {any[]} */ (mod.declarations || [])) {
                    if (!isPropagationCandidate(decl)) continue;
                    propagateAncestorAttributes(decl, declMap, classFileMap, _ts, useTypesChecker);
                }
            }

            const modulesAfterMemberFilters = filterClassMembers(modules);
            const modulesAfterRegistrationFilter = !activeFilterPolicy.omitUnregisteredModules
                ? modulesAfterMemberFilters
                : filterModulesWithRegistrations(modulesAfterMemberFilters, registeredModulePaths);
            const modulesAfterStructuralFilters = filterManifestStructuralMetadata(
                modulesAfterRegistrationFilter
            );

            customElementsManifest.modules = activeFilterPolicy.pruneForStorybook
                ? pruneManifestModules(modulesAfterStructuralFilters)
                : modulesAfterStructuralFilters;

            if (shouldLogManifestModules) {
                logManifestModuleDiagnostics(customElementsManifest.modules || [], manifestMode);
            }
        }
    };
}

export default ArpadroidCemPlugin;
