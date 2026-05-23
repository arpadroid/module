/* eslint-disable security/detect-non-literal-fs-filename, sonarjs/no-ignored-exceptions */

/**
 * @typedef {import('../../../types.js').AttributeDescriptorType} AttributeDescriptorType
 */
import { existsSync, readFileSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { mapPropsToAttributes } from './cem-mapper.utils.js';
import { parseConfigType } from './cem-parser.utils.js';
import { parseConfigTypeWithChecker } from './cem-types-checker.utils.js';

/**
 * Parse a .types source and return manifest-ready attribute descriptors for the provided ConfigType name.
 * @param {any} ts
 * @param {string} sourceText
 * @param {string | undefined | null} typeName
 * @returns {AttributeDescriptorType[]}
 */
export function extractAttributesFromTypesFile(ts, sourceText, typeName) {
    const props = parseConfigType(ts, sourceText, typeName || undefined);
    if (!props || !props.length) return [];
    return mapPropsToAttributes(props);
}

/**
 * Normalize a component class or inferred file base into its expected `*ConfigType` name.
 * @param {string | undefined | null} typeName
 * @param {string} base
 * @returns {string}
 */
export function getConfigTypeName(typeName, base) {
    const sourceName = String(typeName || '').trim();
    if (sourceName) {
        if (/ConfigType$/.test(sourceName)) return sourceName;
        return `${sourceName}ConfigType`;
    }

    return (
        base
            .split(/[-_\.]/)
            .filter(Boolean)
            .map(item => item[0]?.toUpperCase() + item.slice(1))
            .join('') + 'ConfigType'
    );
}

/** @type {Map<string, AttributeDescriptorType[]>} */
const _attributesCache = new Map();
const _MAX_ATTRIBUTES_CACHE = 256;

/**
 * Given a module file path, locate a sibling types file and return manifest-ready attributes.
 * Results are memoized by file path, type name, and checker flag to avoid redundant I/O and
 * TypeScript parsing across the many AST nodes visited per file during `analyzePhase`.
 * @param {any} ts
 * @param {string} moduleFilePath
 * @param {string | undefined | null} typeName
 * @param {boolean} [useChecker]
 * @returns {AttributeDescriptorType[]}
 */
export function attributesFromModule(ts, moduleFilePath, typeName, useChecker = false) {
    if (!moduleFilePath) return [];
    const cacheKey = `${moduleFilePath}::${typeName ?? ''}::${useChecker}`;
    if (_attributesCache.has(cacheKey)) {
        return /** @type {AttributeDescriptorType[]} */ (_attributesCache.get(cacheKey));
    }
    if (_attributesCache.size >= _MAX_ATTRIBUTES_CACHE) {
        const oldest = _attributesCache.keys().next().value;
        if (oldest !== undefined) _attributesCache.delete(oldest);
    }

    const dir = dirname(moduleFilePath);
    const base = basename(moduleFilePath, extname(moduleFilePath));
    const candidates = [join(dir, `${base}.types.d.ts`), join(dir, `${base}.types.ts`)];
    const typesPath = candidates.find(item => existsSync(item));
    if (!typesPath) {
        _attributesCache.set(cacheKey, []);
        return [];
    }

    const sourceText = readFileSync(typesPath, 'utf8');
    const tn = getConfigTypeName(typeName, base);

    let attrs = [];
    if (useChecker) {
        try {
            const props = parseConfigTypeWithChecker(ts, typesPath, sourceText, tn);
            if (props && props.length) {
                attrs = mapPropsToAttributes(props);
                _attributesCache.set(cacheKey, attrs);
                return attrs;
            }
        } catch (_err) {
            /* fallback to text-based parsing below */
        }
    }

    attrs = extractAttributesFromTypesFile(ts, sourceText, tn);
    if ((!attrs || !attrs.length) && sourceText) {
        attrs = extractAttributesFromTypesFile(ts, sourceText, undefined);
    }
    if (!attrs || !attrs.length) {
        console.warn(
            `[arpadroid-cem] Types file found at "${typesPath}" but no ConfigType was matched.` +
                ` Expected an exported type or interface named "${tn}".` +
                ' Verify the file follows the <ComponentName>.types.d.ts naming convention.'
        );
    }
    const result = attrs || [];
    _attributesCache.set(cacheKey, result);
    return result;
}
