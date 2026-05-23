/**
 * @typedef {{ component?: string, argTypes?: Record<string, any> }} ArgTypesEnhancerContext
 * @typedef {ArgTypesEnhancerContext & { __cemDeclaration?: any, __cemAttributeMap?: Map<string, any> }} ResolvedArgTypesEnhancerContext
 */

import { dashedToCamel } from '@arpadroid/tools-iso';

/**
 * Returns the loaded Storybook custom elements manifest, if present.
 * @returns {any | undefined}
 */
function getCustomElementsManifest() {
    // @ts-ignore
    return globalThis.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__;
}

/** @type {Map<string, any> | null} */
let _declarationIndex = null;

/**
 * Builds (on first access) and returns a tagName → declaration Map for O(1) lookups.
 * Invalidated by `processCustomElementsManifest` whenever a new manifest is loaded.
 * @returns {Map<string, any>}
 */
function getDeclarationIndex() {
    if (_declarationIndex) return _declarationIndex;
    _declarationIndex = new Map();
    const modules = getCustomElementsManifest()?.modules || [];
    for (const mod of modules) {
        for (const decl of mod?.declarations || []) {
            if (decl?.tagName) _declarationIndex.set(decl.tagName, decl);
        }
    }
    return _declarationIndex;
}

/**
 * Resolve the manifest declaration for a tag name in O(1) via the lazy index.
 * @param {string | undefined} tagName
 * @returns {any | undefined}
 */
function getManifestDeclaration(tagName) {
    if (!tagName) return undefined;
    return getDeclarationIndex().get(tagName);
}

/**
 * Build an attribute metadata map keyed by camelCase property name.
 * Keying by camelCase ensures consistent lookup regardless of whether
 * an argType originates from a story arg (camelCase) or a CEM attribute (kebab-case).
 * @param {any} declaration
 * @returns {Map<string, any>}
 */
function getAttributeMetadataMap(declaration) {
    const attributes = declaration?.attributes || [];
    const map = new Map();
    for (const attribute of attributes) {
        const name = attribute?.name;
        if (!name) continue;
        const camelName = dashedToCamel(name);
        if (!map.has(camelName)) map.set(camelName, attribute);
    }
    return map;
}

/**
 * Expand argTypes that have richer manifest type detail while keeping the visible summary intact.
 * @param {Record<string, any>} argTypes
 * @param {Map<string, any>} attributeMap
 * @returns {Record<string, any>}
 */
function applyExpandedTypeDetails(argTypes, attributeMap) {
    if (!attributeMap.size) return argTypes;

    return Object.fromEntries(
        Object.entries(argTypes).map(([name, argType]) => {
            const attribute = attributeMap.get(name);
            const detail = String(attribute?.type?.detail || '').trim();
            const summary = String(attribute?.type?.text || '').trim();
            if (!detail || !summary || detail === summary) {
                return [name, argType];
            }

            return [
                name,
                {
                    ...argType,
                    type: {
                        ...argType.type,
                        name: detail
                    },
                    table: {
                        ...(argType.table || {}),
                        type: {
                            ...(argType.table?.type || {}),
                            summary,
                            detail
                        }
                    }
                }
            ];
        })
    );
}

/**
 * Reorder argTypes so manifest attribute order is preserved before any remaining items.
 * @param {Record<string, any>} argTypes
 * @param {Map<string, any>} attributeMap
 * @returns {Record<string, any>}
 */
function reorderArgTypesByManifest(argTypes, attributeMap) {
    if (!attributeMap.size) return argTypes;

    const ownEntries = [];
    const inheritedEntries = [];
    const remainingEntries = [];
    const seen = new Set();
    for (const name of attributeMap.keys()) {
        if (!(name in argTypes)) continue;
        const category = argTypes[name]?.table?.category;
        if (category === 'Inherited Attributes') inheritedEntries.push([name, argTypes[name]]);
        else ownEntries.push([name, argTypes[name]]);
        seen.add(name);
    }

    for (const [name, argType] of Object.entries(argTypes)) {
        if (seen.has(name)) continue;
        remainingEntries.push([name, argType]);
    }

    return Object.fromEntries([...ownEntries, ...inheritedEntries, ...remainingEntries]);
}

/**
 * Returns the literal values from a string union such as `'a' | 'b'`, or `null` when the type is not a pure string-literal union.
 * @param {unknown} typeName
 * @returns {string[] | null}
 */
function getStringLiteralUnionValues(typeName) {
    const text = String(typeName || '').trim();
    if (!text.includes('|')) return null;

    const parts = text
        .split('|')
        .map(part => part.trim())
        .filter(Boolean);
    if (parts.length < 2) return null;

    const values = [];
    for (const part of parts) {
        const match = part.match(/^(['"])(.*)\1$/);
        if (!match) return null;
        values.push(match[2]);
    }

    return values;
}

/**
 * Returns true when the entire string is wrapped in a single pair of parentheses.
 * @param {string} value
 * @returns {boolean}
 */
function hasSingleWrapperParentheses(value) {
    let depth = 0;
    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        if (char === '(') depth += 1;
        if (char === ')') depth -= 1;
        if (depth === 0 && index < value.length - 1) {
            return false;
        }
    }
    return value.startsWith('(') && value.endsWith(')');
}

/**
 * Remove a single wrapping parenthesis pair around a type expression when present.
 * @param {string} value
 * @returns {string}
 */
function unwrapTypeExpression(value) {
    let text = String(value || '').trim();
    while (hasSingleWrapperParentheses(text)) {
        text = text.slice(1, -1).trim();
    }
    return text;
}

/**
 * Returns the array element type for common TypeScript array syntaxes.
 * @param {unknown} typeName
 * @returns {string | null}
 */
function getArrayElementType(typeName) {
    const text = String(typeName || '').trim();
    if (!text) return null;

    if (text.endsWith('[]')) {
        let elementType = text.slice(0, -2).trim();
        if (elementType.startsWith('readonly ')) {
            elementType = elementType.slice('readonly '.length).trim();
        }
        return unwrapTypeExpression(elementType);
    }

    if (text.startsWith('Array<') && text.endsWith('>')) {
        return unwrapTypeExpression(text.slice('Array<'.length, -1));
    }

    if (text.startsWith('ReadonlyArray<') && text.endsWith('>')) {
        return unwrapTypeExpression(text.slice('ReadonlyArray<'.length, -1));
    }

    return null;
}

/**
 * Returns the configured Storybook control type, if present.
 * @param {any} argType
 * @returns {string | undefined}
 */
function getControlType(argType) {
    if (typeof argType?.control === 'string') return argType.control;
    return argType?.control?.type;
}

/**
 * Returns the displayed type text for an argType.
 * @param {any} argType
 * @returns {string}
 */
function getArgTypeTypeText(argType) {
    return String(argType?.table?.type?.summary || argType?.type?.name || '').trim();
}

/**
 * Returns true when an argType description is the synthetic CEM fallback and duplicates the type cell.
 * @param {any} argType
 * @returns {boolean}
 */
function hasSyntheticTypeDescription(argType) {
    const description = String(argType?.description || '').trim();
    const typeText = getArgTypeTypeText(argType);
    return !!description && !!typeText && description === `TS type: ${typeText}`;
}

/**
 * Returns a human-friendly comma-separated input hint for an array type.
 * @param {unknown} typeName
 * @returns {string}
 */
function getCommaSeparatedArrayHint(typeName) {
    const elementType = getArrayElementType(typeName);
    const normalized = String(elementType || '')
        .trim()
        .toLowerCase();

    if (normalized === 'string') return 'Enter a comma-separated list of strings.';
    if (normalized === 'number') return 'Enter a comma-separated list of numbers.';
    if (normalized === 'boolean') return 'Enter a comma-separated list of booleans.';

    return 'Enter a comma-separated list.';
}

/**
 * Appends an array input hint to an argType description when not already present.
 * @param {string | undefined} description
 * @param {unknown} typeName
 * @returns {string}
 */
function getCommaSeparatedArrayDescription(description, typeName) {
    const hint = getCommaSeparatedArrayHint(typeName);
    const text = String(description || '').trim();
    if (!text) return hint;
    if (text.includes(hint)) return text;
    return `${text} ${hint}`;
}

/**
 * Normalizes a comma-separated array control value into a string array.
 * @param {unknown} value
 * @returns {unknown}
 */
export function normalizeCommaSeparatedArrayValue(value) {
    if (value == null || Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;

    const text = value.trim();
    if (!text) return [];

    return text
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

/**
 * Normalizes Storybook control args for array-backed controls before rendering.
 * @param {Record<string, unknown> | undefined} args
 * @param {Record<string, any> | undefined} argTypes
 * @returns {Record<string, unknown>}
 */
export function normalizeArrayArgs(args, argTypes) {
    const sourceArgs = args || {};
    const sourceArgTypes = argTypes || {};

    return Object.fromEntries(
        Object.entries(sourceArgs).map(([name, value]) => {
            if (sourceArgTypes[name]?.__arpadroidArrayControl !== 'text') {
                return [name, value];
            }
            return [name, normalizeCommaSeparatedArrayValue(value)];
        })
    );
}

/**
 * Promotes CEM string-literal unions into Storybook select controls.
 * @param {ArgTypesEnhancerContext} context
 * @returns {Record<string, any>}
 */
function enhanceLiteralUnionArgTypes(context) {
    const argTypes = context?.argTypes || {};

    return Object.fromEntries(
        Object.entries(argTypes).map(([name, argType]) => {
            const values = getStringLiteralUnionValues(argType?.type?.name);
            if (!values?.length || argType?.options?.length || argType?.control) {
                return [name, argType];
            }

            return [
                name,
                {
                    ...argType,
                    type: {
                        ...argType.type,
                        name: 'enum',
                        value: values
                    },
                    control: { type: 'select' },
                    options: values
                }
            ];
        })
    );
}

/**
 * Preserve manifest alias names in the type summary while exposing expanded type detail to later enhancers.
 * @param {ResolvedArgTypesEnhancerContext} context
 * @returns {Record<string, any>}
 */
function enhanceExpandedTypeDetails(context) {
    const argTypes = context?.argTypes || {};
    const attributeMap = context?.__cemAttributeMap ?? getAttributeMetadataMap(context?.__cemDeclaration);
    return applyExpandedTypeDetails(argTypes, attributeMap);
}

/**
 * Removes synthetic fallback descriptions that only duplicate the type column.
 * @param {ArgTypesEnhancerContext} context
 * @returns {Record<string, any>}
 */
function enhanceArgTypeDescriptions(context) {
    const argTypes = context?.argTypes || {};

    return Object.fromEntries(
        Object.entries(argTypes).map(([name, argType]) => {
            if (!hasSyntheticTypeDescription(argType)) {
                return [name, argType];
            }

            return [
                name,
                {
                    ...argType,
                    description: undefined
                }
            ];
        })
    );
}

/**
 * Promotes array-like CEM types into better Storybook controls.
 * Finite string arrays become checkbox groups, while open-ended arrays use text input and are normalized before render.
 * @param {ArgTypesEnhancerContext} context
 * @returns {Record<string, any>}
 */
function enhanceArrayArgTypes(context) {
    const argTypes = context?.argTypes || {};

    return Object.fromEntries(
        Object.entries(argTypes).map(([name, argType]) => {
            const elementType = getArrayElementType(argType?.type?.name);
            if (!elementType) return [name, argType];

            const controlType = getControlType(argType);
            const hasOptions = Array.isArray(argType?.options) && argType.options.length > 0;
            const literalValues = getStringLiteralUnionValues(elementType);

            if (literalValues?.length) {
                if (hasOptions || (controlType && controlType !== 'object')) {
                    return [name, argType];
                }

                return [
                    name,
                    {
                        ...argType,
                        __arpadroidArrayControl: 'options',
                        type: {
                            ...argType.type,
                            name: 'enum',
                            value: literalValues
                        },
                        control: { type: 'check' },
                        options: literalValues
                    }
                ];
            }

            if (controlType && controlType !== 'object') {
                return [name, argType];
            }

            return [
                name,
                {
                    ...argType,
                    __arpadroidArrayControl: 'text',
                    description: getCommaSeparatedArrayDescription(argType?.description, argType?.type?.name),
                    control: { type: 'text' },
                    type: {
                        ...argType.type,
                        name: 'array | string'
                    }
                }
            ];
        })
    );
}

/**
 * Split inherited manifest attributes into their own Storybook controls section and
 * reorder argTypes to match manifest attribute order (own attributes first, then inherited).
 * @param {ResolvedArgTypesEnhancerContext} context
 * @returns {Record<string, any>}
 */
function enhanceInheritedAttributeArgTypes(context) {
    const argTypes = context?.argTypes || {};
    const attributeMap = context?.__cemAttributeMap ?? getAttributeMetadataMap(context?.__cemDeclaration);
    if (!attributeMap.size) return argTypes;

    const nextArgTypes = Object.fromEntries(
        Object.entries(argTypes).map(([name, argType]) => {
            const attribute = attributeMap.get(name);
            if (!attribute) return [name, argType];

            const inheritedFrom = attribute?.inheritedFrom?.name;
            const existingTable = argType?.table || {};
            return [
                name,
                {
                    ...argType,
                    table: {
                        ...existingTable,
                        category: inheritedFrom ? 'Inherited Attributes' : 'Attributes',
                        ...(inheritedFrom ? { subcategory: inheritedFrom } : { subcategory: undefined })
                    }
                }
            ];
        })
    );

    return reorderArgTypesByManifest(nextArgTypes, attributeMap);
}

/**
 * Consolidates camelCase and kebab-case duplicates that refer to the same manifest attribute.
 * Story args use camelCase property names while CEM attributes are kebab-case, which causes
 * both to appear as separate controls in Storybook. This enhancer merges the manifest
 * metadata into the camelCase key and removes the kebab-case duplicate. When only a kebab
 * key exists it is renamed to camelCase to match the camelCase-keyed attribute map used by
 * downstream enhancers.
 * @param {ResolvedArgTypesEnhancerContext} context
 * @returns {Record<string, any>}
 */
function consolidateCamelCaseArgTypes(context) {
    const argTypes = context?.argTypes || {};
    const attributeMap = context?.__cemAttributeMap;
    if (!attributeMap?.size) return argTypes;

    const result = { ...argTypes };
    for (const [camelName, attribute] of attributeMap.entries()) {
        const kebabName = attribute?.name;
        if (!kebabName || kebabName === camelName) continue;

        const hasCamel = camelName in result;
        const hasKebab = kebabName in result;
        if (!hasKebab) continue;

        if (hasCamel) {
            // Both exist: apply manifest type info as base, keep story overrides on top.
            result[camelName] = { ...result[kebabName], ...result[camelName] };
        } else {
            // Only kebab exists: rename to camelCase for consistent downstream lookup.
            result[camelName] = result[kebabName];
        }
        delete result[kebabName];
    }
    return result;
}

/* Each enhancer is a pure function (context) -> argTypes. Order is significant:
 * 0. consolidateCamelCaseArgTypes      — merges kebab/camelCase duplicates into camelCase keys;
 *    must run first so all downstream enhancers operate on a consistent camelCase key set.
 * 1. enhanceInheritedAttributeArgTypes — groups and reorders by manifest; must run first so later
 *    enhancers operate on the already-reordered set.
 * 2. enhanceExpandedTypeDetails        — replaces type.name with the expanded alias detail; must
 *    run before enhanceLiteralUnionArgTypes / enhanceArrayArgTypes which read the expanded name.
 * 3. enhanceArgTypeDescriptions        — strips synthetic CEM fallback descriptions.
 * 4. enhanceLiteralUnionArgTypes       — promotes string-literal unions to select controls.
 * 5. enhanceArrayArgTypes              — promotes array types to check / text controls.
 */
const ARG_TYPE_ENHANCERS = [
    consolidateCamelCaseArgTypes,
    enhanceInheritedAttributeArgTypes,
    enhanceExpandedTypeDetails,
    enhanceArgTypeDescriptions,
    enhanceLiteralUnionArgTypes,
    enhanceArrayArgTypes
];

/**
 * Applies all Storybook argType adaptations derived from the custom elements manifest.
 * @param {ArgTypesEnhancerContext} context
 * @returns {Record<string, any>}
 */
export function enhanceArgTypesFromCem(context) {
    const cemDeclaration = getManifestDeclaration(context?.component);
    const resolvedContext = {
        ...context,
        __cemDeclaration: cemDeclaration,
        __cemAttributeMap: getAttributeMetadataMap(cemDeclaration)
    };
    return ARG_TYPE_ENHANCERS.reduce(
        (argTypes, enhancer) => enhancer({ ...resolvedContext, argTypes }),
        context?.argTypes || {}
    );
}

/**
 * Processes the custom elements manifest to keep only the necessary data for Storybook and reduce memory usage.
 * Specifically, it removes the members information from each declaration, which is not needed for Storybook's purposes.
 * Returns a new object — the original manifest is not mutated.
 * @param {any} manifest
 * @returns {Record<string, unknown>}
 */
export function processCustomElementsManifest(manifest) {
    const processed = /** @type {any} */ ({
        ...manifest,
        modules: manifest?.modules?.map(
            (/** @type {{ declarations?: ({ members?: unknown }[]) }} */ mod) => ({
                ...mod,
                declarations: mod.declarations?.map(({ members: _members, ...decl }) => decl)
            })
        )
    });
    // @ts-ignore
    globalThis.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__ = processed;
    _declarationIndex = null;
    return processed;
}
