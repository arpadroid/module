/* eslint-disable security/detect-non-literal-fs-filename, sonarjs/no-ignored-exceptions */

/**
 * @typedef {import('./arpadroid-cem.utils.types.js').NodeType} NodeType
 * @typedef {import('./arpadroid-cem.utils.types.js').TextType} TextType
 * @typedef {import('./arpadroid-cem.utils.types.js').DescriptorType} DescriptorType
 * @typedef {import('./arpadroid-cem.utils.types.js').AttributeDescriptorType} AttributeDescriptorType
 * @typedef {import('@custom-elements-manifest/analyzer').AnalyzePhaseParams} AnalyzePhaseParams
 */
import { existsSync, readFileSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { parseConfigTypeWithChecker } from './arpadroid-cem.types-checker.utils.js';

////////////////////////////////
// #region Utils
////////////////////////////////

/**
 * Upsert a `tagName` into a moduleDoc's declarations.
 * @param {any} moduleDoc
 * @param {NodeType} opts
 */
export function upsertDeclaration(moduleDoc, { tagName, className }) {
    if (!moduleDoc) return;
    moduleDoc.declarations = moduleDoc.declarations || [];
    const decls = moduleDoc.declarations;

    if (className) {
        const existing = decls.find((/** @type {any} */ dec) => dec?.name === className);
        if (existing) {
            existing.tagName = tagName;
            return;
        }
        decls.push(/** @type {any} */ ({ kind: 'class', name: className, tagName }));
        return;
    }

    decls.push(/** @type {any} */ ({ kind: 'custom-element', tagName }));
}

// #endregion Utils

////////////////////////////////
// #region TagName
////////////////////////////////

/**
 * Parse a `defineCustomElement("tag-name", ClassOrIdentifier)` call AST node.
 * @param {AnalyzePhaseParams} payload
 * @returns {NodeType | null}
 */
export function parseCustomElement(payload) {
    const { ts, node } = payload;
    if (!ts?.isCallExpression(node)) return null;
    const callee = node.expression;
    if (!ts.isIdentifier(callee) || String(callee.escapedText) !== 'defineCustomElement') return null;

    const first = node.arguments?.[0];
    if (!first || !ts.isStringLiteral(first)) return null;
    const tagName = first.text;

    const second = node.arguments?.[1];
    let className;
    if (second) {
        if (ts.isIdentifier(second)) className = String(second.escapedText);
        else if (ts.isClassExpression(second) && second.name) className = String(second.name.escapedText);
    }

    return { tagName, className };
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

// #endregion TagName

///////////////////////////////////////////////
// #region Attributes
//////////////////////////////////////////////

/**
 * Infer a simple type summary and serialization strategy from a TypeScript type string.
 * @param {string} typeText
 * @returns {TextType}
 */
export function inferType(typeText) {
    const text = String(typeText || '');
    const tl = text.toLowerCase();

    let summary = 'unknown';
    if (tl.includes('string')) summary = 'string';
    else if (tl.includes('number')) summary = 'number';
    else if (tl.includes('boolean')) summary = 'boolean';
    else if (tl.includes('array') || /\[\]$/.test(tl) || tl.includes('readonly')) summary = 'array';
    else if (tl.includes('object') || tl.includes('{') || tl.includes('record')) summary = 'object';

    let serializedAs = 'property-only';
    if (/\[\]|Array<|Record<|\{/.test(text)) {
        serializedAs = 'json';
    } else if (/\bboolean\b/.test(text) && !/\bobject\b/.test(text)) {
        serializedAs = 'boolean-attr';
    } else if (/\bnumber\b/.test(text) && !/\bstring\b/.test(text)) {
        serializedAs = 'number';
    } else if (/\bstring\b/.test(text) || /\bnull\b|\bundefined\b/.test(text) || /\|/.test(text)) {
        serializedAs = 'string';
    }

    return { summary, serializedAs };
}

/**
 * Helper: extract property descriptors from a TypeScript 'members' array.
 * Kept at module scope so it can be reasoned about independently.
 * @param {string} sourceText
 * @param {readonly any[]} members
 * @returns {DescriptorType[]}
 */
function propsFromMembers(sourceText, members) {
    const out = [];
    for (const member of members) {
        if (!member.name) continue;
        const propName = member.name.text || (member.name.escapedText && String(member.name.escapedText));
        if (!propName) continue;
        const optional = !!member.questionToken;
        const typeNode = /** @type {any} */ (member.type);
        const typeText = typeNode ? sourceText.slice(typeNode.pos, typeNode.end).trim() : 'any';
        const jsDoc = member.jsDoc && member.jsDoc.length ? String(member.jsDoc[0].comment || '') : undefined;
        out.push({ name: propName, typeText, optional, jsDoc });
    }
    return out;
}

/**
 * Helper: given a declaration node (type alias or interface), return its props.
 * @param {any} ts
 * @param {string} sourceText
 * @param {any} node
 * @returns {DescriptorType[]}
 */
function extractFromDeclaration(ts, sourceText, node) {
    if (ts.isTypeAliasDeclaration(node) && node.name) {
        const tn = node.type;
        if (ts.isTypeLiteralNode(tn)) return propsFromMembers(sourceText, tn.members);
        if (ts.isIntersectionTypeNode(tn)) {
            const acc = [];
            for (const part of tn.types)
                if (ts.isTypeLiteralNode(part)) acc.push(...propsFromMembers(sourceText, part.members));
            return acc;
        }
        return [];
    }
    if (ts.isInterfaceDeclaration(node) && node.name) {
        return propsFromMembers(sourceText, node.members);
    }
    return [];
}
/**
 * Find an exported TypeScript type ending with 'ConfigType' and return its properties.
 * @param {any} ts
 * @param {any} sf
 * @param {string} sourceText
 * @returns {DescriptorType[]|null}
 */
export function findConfigTypeName(ts, sf, sourceText) {
    // No explicit name - find the first exported symbol ending with 'ConfigType'
    for (const stmt of sf.statements) {
        if ((ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) && stmt.name) {
            const name = String(stmt.name.escapedText || stmt.name.text);
            if (/ConfigType$/.test(name)) {
                const res = extractFromDeclaration(ts, sourceText, stmt);
                if (res.length) return res;
            }
        }
    }
    return null;
}

/**
 * Parse a TypeScript `type` or `interface` for a ConfigType and return its properties.
 * @param {any} ts
 * @param {string} sourceText
 * @param {string|undefined|null} typeName
 * @returns {DescriptorType[]}
 */
function parseConfigType(ts, sourceText, typeName) {
    if (!ts || !sourceText) return [];
    const sf = ts.createSourceFile('types.d.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    // If explicit name provided - return its properties (fast path)
    if (typeName) {
        for (const stmt of sf.statements) {
            const name = stmt && stmt.name ? String(stmt.name.escapedText || stmt.name.text) : undefined;
            if (name === typeName) return extractFromDeclaration(ts, sourceText, stmt);
        }
        return [];
    }

    return findConfigTypeName(ts, sf, sourceText) || [];
}

/**
 * Map parsed config properties into attribute descriptors suitable for the manifest.
 * @param {DescriptorType[]} props
 * @returns {AttributeDescriptorType[]}
 */
function mapPropsToAttributes(props) {
    return (props || []).map(prop => {
        const typeText = prop.typeText || 'any';
        const { summary, serializedAs } = inferType(typeText);
        const name = String(prop.name)
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/_/g, '-')
            .replace(/\s+/g, '-')
            .toLowerCase();
        return {
            name,
            type: { text: typeText, summary },
            serializedAs,
            description: prop.jsDoc || `TS type: ${typeText}`,
            optional: !!prop.optional
        };
    });
}

/**
 * Parse a .types.d.ts source and return manifest-ready attribute descriptors for the
 * provided ConfigType name (best-effort).
 * @param {any} ts
 * @param {string} sourceText
 * @param {string|undefined|null} typeName
 * @returns {AttributeDescriptorType[]}
 */
function extractAttributesFromTypesFile(ts, sourceText, typeName) {
    const props = parseConfigType(ts, sourceText, typeName || undefined);
    if (!props || !props.length) return [];
    return mapPropsToAttributes(props);
}

/**
 * Convenience: given a module file path, locate sibling types file and return attributes.
 * @param {any} ts
 * @param {string} moduleFilePath
 * @param {string|undefined|null} typeName
 * @param {boolean} [useChecker]
 * @returns {AttributeDescriptorType[]} Attribute descriptors.
 */
export function attributesFromModule(ts, moduleFilePath, typeName, useChecker = false) {
    // inline findTypesFile (single-use) to reduce exported surface
    if (!moduleFilePath) return [];
    const dir = dirname(moduleFilePath);
    const base = basename(moduleFilePath, extname(moduleFilePath));
    const candidates = [join(dir, `${base}.types.d.ts`), join(dir, `${base}.types.ts`)];
    const typesPath = candidates.find(item => existsSync(item));
    if (!typesPath) return [];

    const sourceText = readFileSync(typesPath, 'utf8');
    const tn =
        typeName ||
        base
            .split(/[-_\.]/)
            .filter(Boolean)
            .map(item => item[0]?.toUpperCase() + item.slice(1))
            .join('') + 'ConfigType';

    let attrs = [];
    if (useChecker) {
        try {
            const props = parseConfigTypeWithChecker(ts, typesPath, sourceText, tn);
            if (props && props.length) return mapPropsToAttributes(props);
        } catch (_err) {
            /* fallback to text-based parsing below */
        }
    }

    attrs = extractAttributesFromTypesFile(ts, sourceText, tn);
    // if no attrs found for the inferred name, try any exported *ConfigType
    if ((!attrs || !attrs.length) && sourceText) {
        return extractAttributesFromTypesFile(ts, sourceText, undefined);
    }
    return attrs || [];
}

/**
 * Handle attributes by parsing a sibling .types.d.ts file for a ConfigType and upserting them into the manifest.
 * @param {AnalyzePhaseParams} payload
 * @param {NodeType | null} parsed
 * @param {boolean} [useChecker] - When true, attempt TypeChecker-based extraction.
 */
export function handleAttributes(payload, parsed = parseCustomElement(payload), useChecker = false) {
    const { ts, node, moduleDoc } = payload;
    const moduleFilePath = node?.getSourceFile()?.fileName;
    const attrs = attributesFromModule(ts, moduleFilePath, parsed?.className, useChecker);
    if (attrs && attrs.length) {
        /** @type {NodeType[]} */
        const decls = moduleDoc.declarations || [];
        const decl =
            decls.find(dec => dec.name === parsed?.className) ||
            decls.find(dec => dec.tagName === parsed?.tagName);
        if (decl) {
            decl.attributes = decl.attributes || [];
            attrs.forEach(attr => {
                if (!decl.attributes?.find(existing => existing.name === attr.name))
                    decl.attributes?.push(attr);
            });
        }
    }
}

// #endregion Attributes
