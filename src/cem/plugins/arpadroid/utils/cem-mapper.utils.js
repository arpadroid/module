/**
 * @typedef {import('./cem-utils.types.js').TextType} TextType
 * @typedef {import('./cem-utils.types.js').DescriptorType} DescriptorType
 * @typedef {import('./cem-utils.types.js').AttributeDescriptorType} AttributeDescriptorType
 */

/**
 * Return true when a type expression is composed only of a primitive plus nullish markers.
 * Examples that return true: `boolean`, `boolean | undefined`, `number | null | undefined`.
 * @param {string} typeText
 * @param {'boolean' | 'number'} primitive
 * @returns {boolean}
 */
function isStrictPrimitiveUnion(typeText, primitive) {
    const normalized = String(typeText || '').replace(/\s+/g, '');
    if (!normalized) return false;

    const unwrapped = normalized.replace(/^\((.*)\)$/, '$1');
    const parts = unwrapped.split('|').filter(Boolean);
    if (!parts.length) return false;

    return parts.every(item => item === primitive || item === 'null' || item === 'undefined');
}

/**
 * Some consumers infer boolean-attribute semantics from `type.text` alone.
 * For unions that include `boolean` but are serialized as non-boolean attributes,
 * emit a safe display text and preserve the authored type in `detail`.
 * @param {string} typeText
 * @param {string} serializedAs
 * @returns {string}
 */
function getManifestTypeText(typeText, serializedAs) {
    if (serializedAs === 'boolean-attr') return typeText;
    if (/\bboolean\b/.test(typeText) && /\|/.test(typeText)) return 'string';
    return typeText;
}

/**
 * Infer a simple type summary and serialization strategy from a TypeScript type string.
 * @param {string} typeText
 * @returns {TextType}
 */
export function inferType(typeText) {
    const text = String(typeText || '');
    const tl = text.toLowerCase();

    let summary = 'unknown';
    if (/\bstring\b/.test(tl)) summary = 'string';
    else if (/\bnumber\b/.test(tl)) summary = 'number';
    else if (/\bboolean\b/.test(tl)) summary = 'boolean';
    else if (/\barray\b/.test(tl) || /\[\]/.test(tl) || /\breadonly\b/.test(tl)) summary = 'array';
    else if (/\bobject\b/.test(tl) || tl.includes('{') || /\brecord\b/.test(tl)) summary = 'object';

    let serializedAs = 'property-only';
    if (/\[\]|Array<|Record<|\{/.test(text)) {
        serializedAs = 'json';
    } else if (isStrictPrimitiveUnion(text, 'boolean')) {
        serializedAs = 'boolean-attr';
    } else if (isStrictPrimitiveUnion(text, 'number')) {
        serializedAs = 'number';
    } else if (/\bstring\b/.test(text) || /\bnull\b|\bundefined\b/.test(text) || /\|/.test(text)) {
        serializedAs = 'string';
    }

    return { summary, serializedAs };
}

/**
 * Sanitize a string into a kebab-case attribute name.
 * @param {any} value
 * @returns {string}
 */
export function sanitizeAttributeName(value) {
    return String(value)
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/_/g, '-')
        .replace(/\s+/g, '-')
        .toLowerCase();
}

/**
 * Map parsed config properties into attribute descriptors suitable for the manifest.
 * @param {DescriptorType[]} props
 * @returns {AttributeDescriptorType[]}
 */
export function mapPropsToAttributes(props) {
    const byName = new Map();
    for (const prop of props || []) {
        const typeText = prop.typeText || 'any';
        const displayTypeText = prop.originalTypeText || typeText;
        const { summary, serializedAs } = inferType(typeText);
        const manifestTypeText = getManifestTypeText(displayTypeText, serializedAs);
        const name = sanitizeAttributeName(prop.name);
        let detailText;
        if (manifestTypeText !== displayTypeText) {
            detailText = displayTypeText;
        } else if (displayTypeText !== typeText) {
            detailText = typeText;
        }

        byName.set(name, {
            name,
            type: {
                text: manifestTypeText,
                summary,
                ...(detailText ? { detail: detailText } : {})
            },
            serializedAs,
            description: prop.jsDoc,
            optional: !!prop.optional
        });
    }

    return [...byName.values()];
}
