/**
 * @typedef {import('../../../types.js').NodeType} NodeType
 * @typedef {import('@custom-elements-manifest/analyzer').AnalyzePhaseParams} AnalyzePhaseParams
 */
import { parseCustomElement } from './cem-parser.utils.js';
import { attributesFromModule } from './cem-source.utils.js';

/**
 * Upsert a `tagName` into a moduleDoc's declarations.
 * @param {any} moduleDoc
 * @param {NodeType} opts
 */
export function upsertDeclaration(moduleDoc, opts) {
    if (!moduleDoc) return;
    const { tagName, className } = opts;
    moduleDoc.declarations = moduleDoc.declarations || [];
    const decls = moduleDoc.declarations;

    if (className) {
        const existing = decls.find((/** @type {{name: string}} */ dec) => dec?.name === className);
        if (existing) {
            existing.tagName = tagName;
            return;
        }
        decls.push({ kind: 'class', name: className, tagName });
        return;
    }

    decls.push({ kind: 'custom-element', tagName });
}

/**
 * Handle a `defineCustomElement` call by upserting its tagName and className into the moduleDoc.
 * @param {AnalyzePhaseParams} payload
 * @returns {NodeType | undefined}
 */
export function handleTagName(payload) {
    const { moduleDoc } = payload;
    const parsed = parseCustomElement(payload);
    if (!parsed || !moduleDoc) return;

    upsertDeclaration(moduleDoc, parsed);
    return parsed;
}

/**
 * Merge ConfigType-derived attributes from an ancestor class into a child declaration.
 * Adds attributes that are not already present on the child, setting `inheritedFrom` to the
 * ancestor class name. Attributes already present — whether the child's own (no `inheritedFrom`)
 * or inherited from a closer ancestor (already has `inheritedFrom`) — are left untouched,
 * preserving nearest-ancestor precedence and child overrides.
 * @param {any} decl - The child class declaration to merge attributes into.
 * @param {any[]} attrs - Attribute descriptors from the ancestor's ConfigType.
 * @param {string} ancestorName - The ancestor class name used to populate `inheritedFrom`.
 */
export function mergeInheritedAttributes(decl, attrs, ancestorName) {
    if (!attrs?.length) return;
    decl.attributes = decl.attributes || [];
    const declAttributes = /** @type {any[]} */ (decl.attributes);
    for (const attr of attrs) {
        const exists = declAttributes.some(existing => existing.name === attr.name);
        if (!exists) {
            declAttributes.push({ ...attr, inheritedFrom: { name: ancestorName } });
        }
    }
}

/**
 * Handle attributes by parsing a sibling types file for a ConfigType and upserting them into the manifest.
 * @param {AnalyzePhaseParams} payload
 * @param {NodeType | null | undefined} parsed
 * @param {boolean} [useChecker]
 * @param {string} [filePath] - Pre-resolved source file path; falls back to `node.getSourceFile().fileName` when omitted.
 */
export function handleAttributes(payload, parsed, useChecker = false, filePath) {
    const { ts, node, moduleDoc } = payload;
    const moduleFilePath = filePath ?? node?.getSourceFile()?.fileName;
    const attrs = attributesFromModule(ts, moduleFilePath, parsed?.className, useChecker);
    if (!attrs?.length) return;

    const decls = /** @type {NodeType[]} */ (moduleDoc.declarations || []);
    const decl =
        decls.find(dec => dec.name === parsed?.className) ||
        decls.find(dec => dec.tagName === parsed?.tagName);
    if (!decl) return;

    decl.attributes = decl.attributes || [];
    const declAttributes = /** @type {any[]} */ (decl.attributes);
    attrs.forEach(attr => {
        const existingIndex = declAttributes.findIndex(existing => existing.name === attr.name);
        if (existingIndex < 0) {
            declAttributes.push(attr);
            return;
        }

        const existing = /** @type {{ inheritedFrom?: unknown } | undefined} */ (
            declAttributes[existingIndex]
        );
        if (existing?.inheritedFrom) {
            declAttributes[existingIndex] = attr;
        }
    });
}
